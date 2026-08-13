#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');
const cacheService = require('../services/cacheService');
const { markGood, clearBrokenImageCache } = require('../services/imageHealthService');

/** Known URLs from DB before auto-clear (Aug 2026) */
const KNOWN_IMAGES = {
  32: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786278905/products/jacgozktgqffds2hfxrt.webp',
  33: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786278785/products/r2qlpzwq4m4j5euk7l1r.webp',
  34: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786278744/products/hp65ph9ablwnmyex6znh.webp',
  35: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1785736718/products/azokwi72gx37vlnk57iz.webp',
  36: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786278670/products/w96glm81xsxdt8vudcr3.webp',
  37: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786278979/products/mkbk0bjff7whqautrham.webp',
  38: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786271990/products/xkc7mtjsdgi9qeqfuhvv.webp',
  39: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786331499/products/uztjjom2hyx7c0pm9yv5.webp',
  41: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786332283/products/wvxxom428hnxm34rrdx3.webp',
  42: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786333443/products/ubvcu6bxfnf8heqxwysw.webp',
  43: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786335205/products/cskzaiyhhjqqbyox3cx1.webp',
  46: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786428743/products/kqggncputyczosnddie8.webp',
  47: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786435504/products/o5rwbyaws3hsld6or28f.webp',
  48: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786503323/products/hqkz8z2djdqvn1uk4rv1.webp',
  49: 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786503515/products/iw3ktvwugrbhef4cxwv7.webp',
};

async function pickRestoreUrl(row) {
  if (row.image) return null;
  try {
    const extras = typeof row.additional_images === 'string'
      ? JSON.parse(row.additional_images)
      : row.additional_images;
    if (Array.isArray(extras) && extras[0]) return extras[0];
  } catch { /* ignore */ }
  return KNOWN_IMAGES[row.id] || null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const res = await pool.query('SELECT id, name, image, additional_images FROM products ORDER BY id');
  let restored = 0;

  if (!dryRun) {
    await clearBrokenImageCache();
  }

  for (const row of res.rows) {
    const url = await pickRestoreUrl(row);
    if (!url) {
      console.log(`⏭️  #${row.id} ${row.name} — no source URL`);
      continue;
    }
    console.log(`${dryRun ? '🔍' : '✅'} #${row.id} ${row.name} ← ${url.slice(-48)}`);
    if (!dryRun) {
      await pool.query('UPDATE products SET image = $1 WHERE id = $2', [url, row.id]);
      await markGood(url);
      restored++;
    }
  }

  if (!dryRun && restored > 0) {
    const keys = ['products:minimal', 'products:all', 'system:init:data', 'app:initial_data', 'admin:dashboard_data'];
    await Promise.all(keys.map((k) => cacheService.delete(k).catch(() => {})));
    console.log(`\n🧹 Restored ${restored} images + cleared caches`);
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
