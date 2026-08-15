import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split("\n")
    .filter(l => l.includes("="))
    .map(l => [l.split("=")[0].trim(), l.split("=").slice(1).join("=").trim()])
);

const DATABASE_URL = vars.DATABASE_URL;
if (!DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("Checking tables...\n");

  // wishlist
  const w = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='wishlist')`;
  if (!w[0].exists) {
    await sql`CREATE TABLE wishlist (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, product_id INTEGER NOT NULL, added_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`CREATE INDEX idx_wishlist_uid ON wishlist(user_id)`;
    console.log("Created wishlist");
  } else {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='wishlist' ORDER BY ordinal_position`;
    console.log("wishlist OK - cols:", cols.map(c => c.column_name).join(", "));
  }

  // faqs
  const f = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='faqs')`;
  if (!f[0].exists) {
    await sql`CREATE TABLE faqs (id SERIAL PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, sort_order INTEGER DEFAULT 0, active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    console.log("Created faqs");
  } else { console.log("faqs OK"); }

  // notifications
  const n = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications')`;
  if (!n[0].exists) {
    await sql`CREATE TABLE notifications (id SERIAL PRIMARY KEY, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', user_id TEXT, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    console.log("Created notifications");
  } else { console.log("notifications OK"); }

  // reviews
  const r = await sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews')`;
  if (!r[0].exists) {
    await sql`CREATE TABLE reviews (id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL, user_id TEXT NOT NULL, user_name TEXT, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await sql`CREATE INDEX idx_reviews_pid ON reviews(product_id)`;
    console.log("Created reviews");
  } else { console.log("reviews OK"); }

  console.log("\nMigration complete!");
}
migrate().catch(e => { console.error("Migration failed:", e.message); process.exit(1); });
