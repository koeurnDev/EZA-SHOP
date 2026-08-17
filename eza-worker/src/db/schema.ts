import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').default(''),
  price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
  image: text('image').default(''),
  stock: integer('stock').notNull().default(0),
  description: text('description').default(''),
  additional_images: jsonb('additional_images').default('[]'),
  variants: jsonb('variants').default('[]'),
  flash_sale_price: numeric('flash_sale_price', { precision: 10, scale: 2 }),
  flash_sale_end: timestamp('flash_sale_end', { withTimezone: true }),
  video_url: text('video_url'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const users = pgTable('users', {
  user_id: text('user_id').primaryKey(),
  user_name: text('user_name'),
  photo_url: text('photo_url'),
  username: text('username'),
  email: text('email'),
  phone: text('phone').default(''),
  address: text('address').default(''),
  role: text('role').default('user'),
  is_banned: boolean('is_banned').default(false),
  is_winback_reminded: boolean('is_winback_reminded').default(false),
  loyalty_points: integer('loyalty_points').default(0),
  telegram_avatar_file_id: text('telegram_avatar_file_id'),
  last_seen: timestamp('last_seen', { withTimezone: true }),
  last_updated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  referred_by: text('referred_by'),
  cart_state: text('cart_state'),
  cart_updated_at: timestamp('cart_updated_at', { withTimezone: true }),
  is_cart_reminded: boolean('is_cart_reminded').default(false),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  user_id: text('user_id'),
  user_name: text('user_name'),
  items: jsonb('items').notNull().default('[]'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0'),
  discount_amount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0'),
  delivery_fee: numeric('delivery_fee', { precision: 12, scale: 2 }).default('0'),
  gross_total: numeric('gross_total', { precision: 12, scale: 2 }).default('0'),
  qr_string: text('qr_string').default(''),
  phone: text('phone'),
  address: text('address'),
  province: text('province'),
  note: text('note'),
  delivery_company: text('delivery_company'),
  payment_method: text('payment_method'),
  order_code: text('order_code').unique(),
  idempotency_key: text('idempotency_key'),
  tracking_number: text('tracking_number'),
  receipt_url: text('receipt_url'),
  status: text('status').default('pending'),
  is_reminded: boolean('is_reminded').default(false),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discount_type: text('discount_type').notNull().default('percent'),
  value: numeric('value', { precision: 12, scale: 2 }).notNull().default('0'),
  is_auto: boolean('is_auto').default(false),
  active: boolean('active').default(true),
  apply_to: text('apply_to').default('all'),
  start_date: timestamp('start_date', { withTimezone: true }),
  end_date: timestamp('end_date', { withTimezone: true }),
  usage_limit: integer('usage_limit'),
  used_count: integer('used_count').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wishlist = pgTable('wishlist', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  product_id: integer('product_id').notNull(),
  added_at: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  user_id: text('user_id').notNull(),
  user_name: text('user_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').default(''),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  q_kh: text('q_kh').default(''),
  q_en: text('q_en').default(''),
  a_kh: text('a_kh').default(''),
  a_en: text('a_en').default(''),
  sort_order: integer('sort_order').default(0),
  is_active: boolean('is_active').default(true),
});