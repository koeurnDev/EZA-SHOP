import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const sqlClient = neon("postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");
const db = drizzle(sqlClient);

async function testAll() {
  try {
    const [topCustomersRes, aovRes, ordersRes] = await Promise.all([
      db.execute(sql`
        SELECT user_name, SUM(total::numeric) as total_spent
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY user_name
        ORDER BY total_spent DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT COALESCE(AVG(total::numeric), 0) as aov
        FROM orders 
        WHERE status != 'cancelled'
      `),
      db.execute(sql`SELECT items FROM orders WHERE status != 'cancelled'`)
    ]);
    console.log("Success:", {
      aov: parseFloat(aovRes.rows[0]?.aov || '0')
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

testAll();
