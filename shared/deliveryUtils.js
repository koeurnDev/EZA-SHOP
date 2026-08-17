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

export function calculateDeliveryFeeCents(subtotalCents, deliveryFeeSetting, deliveryThresholdSetting, province = 'Phnom Penh', provincialDeliveryFeeSetting = null) {
  const feePP = parseDeliverySetting(deliveryFeeSetting, 1.5);
  const feeProvincial = parseDeliverySetting(provincialDeliveryFeeSetting, 2.5);
  const threshold = parseDeliverySetting(deliveryThresholdSetting, 50);
  
  const isPhnomPenh = !province || province.toLowerCase().includes('phnom penh') || province.trim() === '';
  const fee = isPhnomPenh ? feePP : feeProvincial;

  if (fee <= 0) return 0;
  if (subtotalCents >= toCents(threshold)) return 0;
  return toCents(fee);
}

export function calculateDeliveryFee(subtotal, deliveryFeeSetting, deliveryThresholdSetting, province = 'Phnom Penh', provincialDeliveryFeeSetting = null) {
  return fromCents(
    calculateDeliveryFeeCents(toCents(subtotal), deliveryFeeSetting, deliveryThresholdSetting, province, provincialDeliveryFeeSetting)
  );
}
