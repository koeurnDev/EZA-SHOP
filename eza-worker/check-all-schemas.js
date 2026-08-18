const { Pool } = require('pg');

async function check() {
  const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query('SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = \'public\'');
    const dbColumns = {};
    for (const row of res.rows) {
      if (!dbColumns[row.table_name]) dbColumns[row.table_name] = [];
      dbColumns[row.table_name].push(row.column_name);
    }
    console.log(JSON.stringify(dbColumns, null, 2));
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  } finally {
    await pool.end();
  }
}
check();
