-- User wishlist (favorites) — must run before index migrations (005, 05)
CREATE TABLE IF NOT EXISTS wishlist (
  user_id BIGINT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);
