const pool = require('../config/database');
const cacheService = require('./cacheService');

const BROKEN_PREFIX = 'broken:image:';
const GOOD_PREFIX = 'good:image:';
const BROKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const GOOD_TTL = 24 * 60 * 60; // 1 day

const hashUrl = (url) => Buffer.from(url).toString('base64url').slice(0, 48);

const isCloudinaryUrl = (url) => typeof url === 'string' && url.includes('cloudinary.com');

async function isMarkedBroken(url) {
  if (!url) return false;
  return !!(await cacheService.get(`${BROKEN_PREFIX}${hashUrl(url)}`));
}

async function markBroken(url) {
  if (!url) return;
  await cacheService.set(`${BROKEN_PREFIX}${hashUrl(url)}`, true, BROKEN_TTL);
  await cacheService.delete(`${GOOD_PREFIX}${hashUrl(url)}`);
}

async function markGood(url) {
  if (!url) return;
  await cacheService.set(`${GOOD_PREFIX}${hashUrl(url)}`, true, GOOD_TTL);
}

async function checkUrlAlive(url) {
  if (!url || !isCloudinaryUrl(url)) return true;
  if (await isMarkedBroken(url)) return false;

  const goodKey = `${GOOD_PREFIX}${hashUrl(url)}`;
  if (await cacheService.get(goodKey)) return true;

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
    // Network blip — don't mark broken
    return true;
  }
}

async function sanitizeProductImages(products) {
  if (!Array.isArray(products) || products.length === 0) return products;

  const checks = await Promise.all(
    products.map(async (p) => {
      if (!p?.image || !isCloudinaryUrl(p.image)) return { id: p.id, broken: false };
      const broken = await isMarkedBroken(p.image);
      return { id: p.id, broken };
    })
  );

  const brokenIds = new Set(checks.filter((c) => c.broken).map((c) => c.id));
  if (brokenIds.size === 0) return products;

  return products.map((p) => (brokenIds.has(p.id) ? { ...p, image: null } : p));
}

async function scanAndRepairProducts({ clearDb = true } = {}) {
  const res = await pool.query(
    'SELECT id, name, image FROM products WHERE image IS NOT NULL AND image <> \'\''
  );

  const broken = [];
  for (const row of res.rows) {
    const alive = await checkUrlAlive(row.image);
    if (!alive) {
      broken.push({ id: row.id, name: row.name, url: row.image });
      if (clearDb) {
        await pool.query('UPDATE products SET image = NULL WHERE id = $1', [row.id]);
      }
    }
  }

  if (broken.length > 0) {
    await cacheService.delete('products:minimal');
    await cacheService.delete('products:all');
    await cacheService.delete('system:init:data');
    await cacheService.delete('app:initial_data');
    await cacheService.delete('admin:dashboard_data');
  }

  return { scanned: res.rows.length, broken, cleared: clearDb ? broken.length : 0 };
}

module.exports = {
  checkUrlAlive,
  sanitizeProductImages,
  scanAndRepairProducts,
  isMarkedBroken,
  markBroken,
};
