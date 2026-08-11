require('./bot/node_modules/dotenv').config({ path: require('path').join(__dirname, 'bot', '.env') });
const pool = require('./bot/config/database');

pool.query("SELECT id, name, image FROM products ORDER BY id DESC LIMIT 10").then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
