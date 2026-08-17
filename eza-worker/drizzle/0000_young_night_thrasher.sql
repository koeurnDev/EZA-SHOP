CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text DEFAULT 'percent' NOT NULL,
	"value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_auto" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"apply_to" text DEFAULT 'all',
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"q_kh" text DEFAULT '',
	"q_en" text DEFAULT '',
	"a_kh" text DEFAULT '',
	"a_en" text DEFAULT '',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_name" text,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0',
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"delivery_fee" numeric(12, 2) DEFAULT '0',
	"gross_total" numeric(12, 2) DEFAULT '0',
	"qr_string" text DEFAULT '',
	"phone" text,
	"address" text,
	"province" text,
	"note" text,
	"delivery_company" text,
	"payment_method" text,
	"order_code" text,
	"idempotency_key" text,
	"tracking_number" text,
	"receipt_url" text,
	"status" text DEFAULT 'pending',
	"is_reminded" boolean DEFAULT false,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_code_unique" UNIQUE("order_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '',
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"image" text DEFAULT '',
	"stock" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '',
	"additional_images" jsonb DEFAULT '[]',
	"variants" jsonb DEFAULT '[]',
	"flash_sale_price" numeric(10, 2),
	"flash_sale_end" timestamp with time zone,
	"video_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"user_name" text,
	"photo_url" text,
	"username" text,
	"email" text,
	"phone" text DEFAULT '',
	"address" text DEFAULT '',
	"role" text DEFAULT 'user',
	"is_banned" boolean DEFAULT false,
	"is_winback_reminded" boolean DEFAULT false,
	"loyalty_points" integer DEFAULT 0,
	"telegram_avatar_file_id" text,
	"last_seen" timestamp with time zone,
	"last_updated" timestamp with time zone DEFAULT now(),
	"referred_by" text,
	"cart_state" text,
	"cart_updated_at" timestamp with time zone,
	"is_cart_reminded" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
