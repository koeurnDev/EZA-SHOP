require('./bot/node_modules/dotenv').config({ path: require('path').join(__dirname, 'bot', '.env') });
const pool = require('./bot/config/database');

async function fixProduct44() {
  const fallbackUrl = 'https://res.cloudinary.com/dhabxzsx7/image/upload/v1786331883/products/u54febpvmkzim2fvpb02.webp';
  const res = await pool.query(
    "UPDATE products SET image = $1 WHERE id = 44 RETURNING *",
    [fallbackUrl]
  );
  console.log("Updated product 44:", res.rows[0]);
  process.exit(0);
}
fixProduct44();
