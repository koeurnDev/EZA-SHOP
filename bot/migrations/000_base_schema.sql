-- Vibe Lifestyle / MO-MO base schema (fresh Neon DB)
-- Runs before 000_wishlist.sql (000_base < 000_wish)

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  additional_images JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  flash_sale_price NUMERIC(10, 2),
  flash_sale_end TIMESTAMPTZ,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT PRIMARY KEY,
  user_name TEXT,
  photo_url TEXT,
  username TEXT,
  email TEXT,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  role TEXT DEFAULT 'user',
  is_banned BOOLEAN DEFAULT false,
  is_winback_reminded BOOLEAN DEFAULT false,
  loyalty_points INTEGER DEFAULT 0,
  telegram_avatar_file_id TEXT,
  last_seen TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id BIGINT,
  user_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  delivery_fee NUMERIC(12, 2) DEFAULT 0,
  gross_total NUMERIC(12, 2) DEFAULT 0,
  qr_string TEXT DEFAULT '',
  phone TEXT,
  address TEXT,
  province TEXT,
  note TEXT,
  delivery_company TEXT,
  payment_method TEXT,
  order_code TEXT UNIQUE,
  idempotency_key TEXT,
  tracking_number TEXT,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  is_reminded BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_auto BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  apply_to TEXT DEFAULT 'all',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_products (
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (coupon_id, product_id)
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id SERIAL PRIMARY KEY,
  message TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (key, value) VALUES
  ('shop_status', 'open'),
  ('receipt_shop_name', 'Vibe Lifestyle'),
  ('receipt_subtitle', 'អីវ៉ាន់បោះដុំ និងរាយ'),
  ('delivery_fee', '1.50'),
  ('delivery_threshold', '50')
ON CONFLICT (key) DO NOTHING;

INSERT INTO categories (name) VALUES
  ('💄 គ្រឿងសំអាង (Beauty & Skincare)'),
  ('👗 សម្លៀកបំពាក់ (Clothes)'),
  ('👜 កាបូប (Bags)'),
  ('👟 ស្បែកជើង (Shoes)')
ON CONFLICT (name) DO NOTHING;
