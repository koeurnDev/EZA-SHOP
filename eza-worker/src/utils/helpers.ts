import { nanoid } from 'nanoid';

/**
 * Generate unique order code
 */
export function generateOrderCode(): string {
  return `EZA-${nanoid(8).toUpperCase()}`;
}

/**
 * Calculate delivery fee based on settings
 */
export function calculateDeliveryFee(subtotal: number, deliveryFee: number, threshold: number): number {
  return subtotal >= threshold ? 0 : deliveryFee;
}

/**
 * Apply discount to items
 */
export function applyDiscount(subtotal: number, discountType: 'percent' | 'fixed', discountValue: number): number {
  if (discountType === 'percent') {
    return Math.min(subtotal, (subtotal * discountValue) / 100);
  } else {
    return Math.min(subtotal, discountValue);
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Validate phone number (basic)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\+\-\(\)]{8,20}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Sanitize string for safety
 */
export function sanitizeString(str: string): string {
  return str.replace(/[<>\"'&]/g, '').trim();
}

/**
 * Generate expiry time for orders (7 hours from now)
 */
export function generateExpiryTime(): Date {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000));
}

/**
 * Check if flash sale is active
 */
export function isFlashSaleActive(flashSaleEnd?: string): boolean {
  if (!flashSaleEnd) return false;
  return new Date(flashSaleEnd) > new Date();
}

/**
 * Get effective price (flash sale or regular)
 */
export function getEffectivePrice(regularPrice: number, flashSalePrice?: number, flashSaleEnd?: string): number {
  if (flashSalePrice && isFlashSaleActive(flashSaleEnd)) {
    return flashSalePrice;
  }
  return regularPrice;
}

/**
 * Parse JSON safely
 */
export function parseJsonSafe<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) || defaultValue;
  } catch {
    return defaultValue;
  }
}