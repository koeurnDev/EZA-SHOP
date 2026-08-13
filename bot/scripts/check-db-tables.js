require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const tables = await c.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log(`TABLES (${tables.rows.length}):`);
  tables.rows.forEach((x) => console.log(' -', x.table_name));

  const migrations = await c.query('SELECT filename FROM schema_migrations ORDER BY filename');
  console.log(`\nMIGRATIONS (${migrations.rows.length}):`);
  migrations.rows.forEach((x) => console.log(' -', x.filename));

  const counts = await c.query(`
    SELECT 'products' AS t, COUNT(*)::int AS n FROM products
    UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
    UNION ALL SELECT 'users', COUNT(*)::int FROM users
    UNION ALL SELECT 'settings', COUNT(*)::int FROM settings
    UNION ALL SELECT 'categories', COUNT(*)::int FROM categories
    UNION ALL SELECT 'coupons', COUNT(*)::int FROM coupons
    UNION ALL SELECT 'wishlist', COUNT(*)::int FROM wishlist
    UNION ALL SELECT 'reviews', COUNT(*)::int FROM reviews
    UNION ALL SELECT 'faqs', COUNT(*)::int FROM faqs
    UNION ALL SELECT 'broadcasts', COUNT(*)::int FROM broadcasts
  `);

  console.log('\nROW COUNTS:');
  counts.rows.forEach((x) => console.log(` - ${x.t}: ${x.n}`));

  await c.end();
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
