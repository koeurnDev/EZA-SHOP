const { Client } = require('pg');
require('dotenv').config();

async function checkProducts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('\n🔍 Checking recent products...\n');
    
    const res = await client.query(`
      SELECT id, name, price, stock, category, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log(`📦 Found ${res.rows.length} products:\n`);
    res.rows.forEach((p, i) => {
      console.log(`${i + 1}. [${p.id}] ${p.name}`);
      console.log(`   Price: $${p.price} | Stock: ${p.stock} | Category: ${p.category}`);
      console.log(`   Created: ${p.created_at}\n`);
    });
    
    const countRes = await client.query('SELECT COUNT(*) as total FROM products');
    console.log(`📊 Total products in database: ${countRes.rows[0].total}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkProducts();
