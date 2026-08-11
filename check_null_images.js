require('./bot/node_modules/dotenv').config({ path: require('path').join(__dirname, 'bot', '.env') });
const pool = require('./bot/config/database');

async function checkImages() {
  const res = await pool.query("SELECT id, name, image FROM products");
  const nullImages = res.rows.filter(p => !p.image || p.image.trim() === '');
  console.log("Total products:", res.rows.length);
  console.log("Products with NULL/empty image:", nullImages);
  process.exit(0);
}
checkImages();
