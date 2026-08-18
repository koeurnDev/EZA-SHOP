import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function testAOV() {
  try {
    const res = await sql`SELECT COALESCE(AVG(total::numeric), 0) as aov FROM orders WHERE status != 'cancelled'`;
    console.log("AOV Result:", res);
  } catch (err) {
    console.error("AOV Error:", err);
  }
}

testAOV();
