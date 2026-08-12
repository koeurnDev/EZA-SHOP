function parseDeliverySetting(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

const toCents = (val) => Math.round(Number(val || 0) * 100);

function calculateDeliveryFeeCents(subtotalCents, deliveryFeeSetting, deliveryThresholdSetting) {
  const fee = parseDeliverySetting(deliveryFeeSetting, 1.5);
  const threshold = parseDeliverySetting(deliveryThresholdSetting, 50);
  if (fee <= 0) return 0;
  if (subtotalCents >= toCents(threshold)) return 0;
  return toCents(fee);
}

module.exports = {
  parseDeliverySetting,
  calculateDeliveryFeeCents,
  toCents
};
