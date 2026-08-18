export interface Env {
  // Secrets from Wrangler
  DATABASE_URL: string;
  BOT_TOKEN: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  SESSION_SECRET: string;
  SUPERADMIN_ID: string;
  
  // Environment variables
  NODE_ENV: string;
  TEST_TOKEN?: string;
  BAKONG_ACCOUNT_ID?: string;
  BAKONG_MERCHANT_NAME?: string;
  BOT_USERNAME?: string;
}

export interface Variables {
  userId: string;
  isAdmin: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  description: string;
  additional_images: string[];
  variants: any[];
  flash_sale_price?: number;
  flash_sale_end?: string;
  video_url?: string;
  created_at: string;
}

export interface Order {
  id?: number;
  user_id: string;
  user_name: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  gross_total: number;
  phone: string;
  address: string;
  province: string;
  note?: string;
  delivery_company: string;
  payment_method: string;
  order_code: string;
  qr_string?: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'expired';
  expires_at?: string;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface User {
  user_id: string;
  user_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin';
  is_banned: boolean;
  loyalty_points: number;
  last_seen?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}