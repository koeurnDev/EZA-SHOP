const pool = require('../config/database');
const cacheService = require('./cacheService');

const BROKEN_PREFIX = 'broken:image:';
const GOOD_PREFIX = 'good:image:';
const BROKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const GOOD_TTL = 24 * 60 * 60; // 1 day

const hashUrl = (url) => Buffer.from(url).toString('base64url').slice(0, 48);

const isCloudinaryUrl = (url) => typeof url === 'string' && url.includes('cloudinary.com');

/** e.g. products/u54febpvmkzim2fvpb02.webp */
const extractCloudinaryAssetKey = (url) => {
  if (!url || !isCloudinaryUrl(url)) return null;
  const match = String(url).match(/\/v\d+\/(.+)$/);
  return match ? match[1] : null;
};

const invalidateProductCaches = async () => {
  await Promise.all([
    cacheService.delete('products:minimal'),
    cacheService.delete('products:all'),
    cacheService.delete('system:init:data'),
    cacheService.delete('app:initial_data'),
    cacheService.delete('admin:dashboard_data'),
  ].map((p) => p.catch(() => {})));
};

async function isMarkedBroken(url) {
  if (!url) return false;
  if (await cacheService.get(`${BROKEN_PREFIX}${hashUrl(url)}`)) return true;
  const assetKey = extractCloudinaryAssetKey(url);
  if (assetKey && (await cacheService.get(`${BROKEN_PREFIX}${hashUrl(assetKey)}`))) return true;
  return false;
}

async function markBroken(url) {
  if (!url) return;
  await cacheService.set(`${BROKEN_PREFIX}${hashUrl(url)}`, true, BROKEN_TTL);
  await cacheService.delete(`${GOOD_PREFIX}${hashUrl(url)}`);
  const assetKey = extractCloudinaryAssetKey(url);
  if (assetKey) {
    await cacheService.set(`${BROKEN_PREFIX}${hashUrl(assetKey)}`, true, BROKEN_TTL);
    await cacheService.delete(`${GOOD_PREFIX}${hashUrl(assetKey)}`);
  }
}

async function markGood(url) {
  if (!url) return;
  await cacheService.set(`${GOOD_PREFIX}${hashUrl(url)}`, true, GOOD_TTL);
}

async function checkUrlAlive(url) {
  if (!url || !isCloudinaryUrl(url)) return true;

  const goodKey = `${GOOD_PREFIX}${hashUrl(url)}`;
  if (await cacheService.get(goodKey)) return true;

  return verifyUrlWithHead(url);
}

/** Always HEAD-check — ignore stale Redis "broken" flags (prevents mass DB wipe) */
async function verifyUrlWithHead(url) {
  if (!url || !isCloudinaryUrl(url)) return true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);

    if (res.ok) {
      await markGood(url);
      return true;
    }
    await markBroken(url);
    return false;
  } catch {
    return true;
  }
}

async function sanitizeProductImages(products) {
  return products;
}

async function scanAndRepairProducts({ clearDb = false } = {}) {
  const res = await pool.query(
    'SELECT id, name, image FROM products WHERE image IS NOT NULL AND image <> \'\''
  );

  const broken = [];
  for (const row of res.rows) {
    const alive = await verifyUrlWithHead(row.image);
    if (!alive) {
      broken.push({ id: row.id, name: row.name, url: row.image });
      if (clearDb) {
        await pool.query('UPDATE products SET image = NULL WHERE id = $1', [row.id]);
      }
    }
  }

  if (broken.length > 0) {
    await invalidateProductCaches();
  }

  return { scanned: res.rows.length, broken, cleared: clearDb ? broken.length : 0 };
}

function stripBrokenFromAdditionalImages(raw, assetKey) {
  if (!raw || !assetKey) return { changed: false, value: raw };
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return { changed: false, value: raw };
    const next = list.filter((u) => typeof u === 'string' && !u.includes(assetKey));
    if (next.length === list.length) return { changed: false, value: raw };
    return { changed: true, value: JSON.stringify(next) };
  } catch {
    return { changed: false, value: raw };
  }
}

/** Client or scan reports a 404 — mark cache; optional DB cleanup (admin scan only) */
async function reportBrokenImage(url, { clearDb = false } = {}) {
  if (!url || !isCloudinaryUrl(url)) {
    return { cleared: 0, products: [] };
  }

  const assetKey = extractCloudinaryAssetKey(url);
  if (!assetKey) {
    await markBroken(url);
    return { cleared: 0, products: [] };
  }

  await markBroken(url);

  if (!clearDb) {
    return { cleared: 0, products: [], assetKey, cached: true };
  }

  const likePattern = `%${assetKey}%`;
  const cleared = [];

  const mainRes = await pool.query(
    'UPDATE products SET image = NULL WHERE image LIKE $1 RETURNING id, name',
    [likePattern]
  );
  cleared.push(...mainRes.rows);

  const extraRes = await pool.query(
    'SELECT id, name, additional_images FROM products WHERE additional_images IS NOT NULL AND additional_images::text LIKE $1',
    [likePattern]
  );

  for (const row of extraRes.rows) {
    const { changed, value } = stripBrokenFromAdditionalImages(row.additional_images, assetKey);
    if (changed) {
      await pool.query('UPDATE products SET additional_images = $1 WHERE id = $2', [value, row.id]);
      if (!cleared.some((p) => p.id === row.id)) {
        cleared.push({ id: row.id, name: row.name });
      }
    }
  }

  if (cleared.length > 0) {
    await invalidateProductCaches();
  }

  const orderRes = await pool.query(
    'SELECT id, order_code, items FROM orders WHERE items::text LIKE $1',
    [likePattern]
  );

  for (const row of orderRes.rows) {
    try {
      const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items;
      if (!Array.isArray(items)) continue;
      let changed = false;
      const next = items.map((item) => {
        if (item?.image?.includes(assetKey)) {
          changed = true;
          return { ...item, image: null };
        }
        return item;
      });
      if (changed) {
        await pool.query('UPDATE orders SET items = $1 WHERE id = $2', [JSON.stringify(next), row.id]);
      }
    } catch { /* ignore malformed order items */ }
  }

  return { cleared: cleared.length, products: cleared, assetKey };
}

async function clearBrokenImageCache() {
  await cacheService.clearPattern('broken:image:*');
  await cacheService.clearPattern('good:image:*');
}

module.exports = {
  checkUrlAlive,
  verifyUrlWithHead,
  sanitizeProductImages,
  scanAndRepairProducts,
  reportBrokenImage,
  isMarkedBroken,
  markBroken,
  markGood,
  clearBrokenImageCache,
};
