const pool = require('./bot/config/database');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'").then(res => {
  console.log(res.rows.map(r => r.column_name));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
