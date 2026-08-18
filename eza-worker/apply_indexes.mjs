import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.dev.vars' });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Applying indexes...");
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "orders" USING btree ("user_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" USING btree ("status")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" USING btree ("created_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_products_stock" ON "products" USING btree ("stock")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products" USING btree ("created_at")`;
  await sql`CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role")`;
  console.log("Indexes applied successfully!");
}

run().catch(console.error);
