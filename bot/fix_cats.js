const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  await client.connect();
  console.log('Connected!');
  
  await client.query(`UPDATE products SET category = 'ទឹកអប់ (Perfume)' WHERE category = 'Perfume' OR category = 'perfume' OR category = 'ទឹកអប់'`);
  console.log('Updated Perfume');

  await client.query(`UPDATE products SET category = 'ស្ព្រេយ៍ (Bodyspray)' WHERE category = 'Bodyspray' OR category = 'bodyspray' OR category = 'ស្ព្រេយ៍'`);
  console.log('Updated Bodyspray');
  
  await client.query(`UPDATE products SET category = 'ស្បែកជើង (Shoes)' WHERE category = 'Shoes' OR category = 'shoes' OR category = 'ស្បែកជើង'`);
  console.log('Updated Shoes');

  await client.query(`UPDATE products SET category = 'ថែរក្សាកាយ (Body Care)' WHERE category = 'Body Care' OR category = 'bodycare' OR category = 'ថែរក្សាកាយ'`);
  console.log('Updated Body Care');

  await client.end();
  console.log('Done!');
}

run().catch(console.error);
