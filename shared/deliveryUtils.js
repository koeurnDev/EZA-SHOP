/**
 * Shared delivery fee rules — single source of truth for bot + webapp.
 */
export const toCents = (val) => Math.round(Number(val || 0) * 100);
export const fromCents = (cents) => Math.round(cents) / 100;

export function parseDeliverySetting(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateDeliveryFeeCents(subtotalCents, deliveryFeeSetting, deliveryThresholdSetting) {
  const fee = parseDeliverySetting(deliveryFeeSetting, 1.5);
  const threshold = parseDeliverySetting(deliveryThresholdSetting, 50);
  if (fee <= 0) return 0;
  if (subtotalCents >= toCents(threshold)) return 0;
  return toCents(fee);
}

export function calculateDeliveryFee(subtotal, deliveryFeeSetting, deliveryThresholdSetting) {
  return fromCents(
    calculateDeliveryFeeCents(toCents(subtotal), deliveryFeeSetting, deliveryThresholdSetting)
  );
}
