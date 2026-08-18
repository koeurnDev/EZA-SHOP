const { Pool } = require('pg');


async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Migrating users...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cart_state text;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cart_updated_at timestamp with time zone;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cart_reminded boolean DEFAULT false;`);
    
    console.log('Migrating faqs...');
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS q_kh text DEFAULT '';`);
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS q_en text DEFAULT '';`);
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS a_kh text DEFAULT '';`);
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS a_en text DEFAULT '';`);
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;`);
    await pool.query(`ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;`);
    
    try {
      await pool.query(`ALTER TABLE faqs DROP COLUMN IF EXISTS question;`);
      await pool.query(`ALTER TABLE faqs DROP COLUMN IF EXISTS answer;`);
      await pool.query(`ALTER TABLE faqs DROP COLUMN IF EXISTS active;`);
      await pool.query(`ALTER TABLE faqs DROP COLUMN IF EXISTS created_at;`);
    } catch(e) {
      console.log('Ignore drop errors:', e.message);
    }
    
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
