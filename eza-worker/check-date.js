const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { pgTable, timestamp } = require('drizzle-orm/pg-core');

const db = drizzle(neon('postgresql://neondb_owner:npg_NBl0F4jPJaoO@ep-sparkling-waterfall-aztxjqz9-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'));
const users = pgTable('users', { last_seen: timestamp('last_seen', { withTimezone: true }) });
const products = pgTable('products', { created_at: timestamp('created_at', { withTimezone: true }) });

async function check() {
  const [u] = await db.select().from(users).limit(1);
  const [p] = await db.select().from(products).limit(1);
  console.log('last_seen type:', u ? typeof u.last_seen : 'no user', u?.last_seen instanceof Date);
  console.log('created_at type:', p ? typeof p.created_at : 'no product', p?.created_at instanceof Date);
}
check().catch(console.error);
