const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

client.connect()
  .then(() => client.query('SELECT id, name, price, stock FROM products LIMIT 5'))
  .then(res => {
    console.log('Products found:', res.rows.length);
    console.log(res.rows);
  })
  .catch(console.error)
  .finally(() => client.end());
