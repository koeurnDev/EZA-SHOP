/**
 * Fix Broken Product Images
 * Finds products referencing non-existent Cloudinary images and sets them to null
 * so the frontend fallback (/favicon.png) handles it gracefully.
 */
require('./bot/node_modules/dotenv').config({ path: require('path').join(__dirname, 'bot', '.env') });
const pool = require('./bot/config/database');

async function fixBrokenImages() {
  try {
    // 1. Find all products with images
    const { rows: products } = await pool.query(
      "SELECT id, name, image FROM products WHERE image IS NOT NULL AND image != ''"
    );

    console.log(`\n🔍 Checking ${products.length} products with images...\n`);

    const broken = [];

    for (const product of products) {
      try {
        const response = await fetch(product.image, { method: 'HEAD' });
        if (!response.ok) {
          broken.push(product);
          console.log(`❌ [ID: ${product.id}] "${product.name}" → ${response.status} (${product.image})`);
        } else {
          console.log(`✅ [ID: ${product.id}] "${product.name}" → OK`);
        }
      } catch (err) {
        broken.push(product);
        console.log(`❌ [ID: ${product.id}] "${product.name}" → Network Error (${product.image})`);
      }
    }

    console.log(`\n📊 Results: ${products.length - broken.length} OK, ${broken.length} broken\n`);

    if (broken.length > 0) {
      console.log('🔧 Fixing broken images (setting to NULL)...\n');
      for (const product of broken) {
        await pool.query("UPDATE products SET image = NULL WHERE id = $1", [product.id]);
        console.log(`   Fixed product #${product.id} "${product.name}"`);
      }
      console.log('\n✅ All broken images have been cleared. Upload new images via the admin panel.');
    } else {
      console.log('🎉 All product images are valid!');
    }

    process.exit(0);
  } catch (err) {
    console.error('💥 Error:', err.message);
    process.exit(1);
  }
}

fixBrokenImages();
