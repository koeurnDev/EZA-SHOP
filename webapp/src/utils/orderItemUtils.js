import { getVariantUnitMode, VARIANT_UNIT } from './variantUnitUtils';

const VARIANT_LABELS = {
  kh: { size: 'ទំហំ', color: 'ពណ៌', weight: 'ទម្ងន់', height: 'កម្ពស់', variant: 'ជម្រើស' },
  en: { size: 'Size', color: 'Color', weight: 'Weight', height: 'Height', variant: 'Opt' }
};

const parseVariantValue = (variant) => {
  if (!variant) return null;
  if (typeof variant === 'string') {
    try {
      const parsed = JSON.parse(variant);
      return typeof parsed === 'object' && parsed !== null ? parsed : { label: variant };
    } catch {
      return { label: variant };
    }
  }
  if (typeof variant === 'object') return variant;
  return { label: String(variant) };
};

export const extractOrderItemSpecs = (item) => {
  const v = parseVariantValue(item?.variant);
  const size = item?.selectedSize || item?.size || v?.size || '';
  const color = item?.selectedColor || item?.color || v?.color || '';
  const weight = item?.selectedWeight || item?.weight || item?.kilo || item?.weight_kg || v?.weight || '';
  const height = item?.selectedHeight || item?.height || v?.height || '';
  const option =
    item?.selectedVariant ||
    item?.option ||
    v?.label ||
    v?.name ||
    (v && !v.size && !v.color && !v.weight && !v.height ? v.value : '') ||
    '';

  return {
    size: size ? String(size) : '',
    color: color ? String(color) : '',
    weight: weight ? String(weight) : '',
    height: height ? String(height) : '',
    variant: option ? String(option) : ''
  };
};

export const getVariantLabels = (lang, opts = {}) => {
  const base = VARIANT_LABELS[lang === 'kh' ? 'kh' : 'en'];
  const unitMode = opts.unitMode || getVariantUnitMode({
    category: opts.category || '',
    productName: opts.productName || '',
    variantSizes: opts.sizeValue ? [opts.sizeValue] : []
  });

  if (unitMode === VARIANT_UNIT.LITER) {
    return { ...base, size: lang === 'kh' ? 'លីត្រ' : 'Volume' };
  }

  if (unitMode === VARIANT_UNIT.WEIGHT) {
    return { ...base, size: lang === 'kh' ? 'ទម្ងន់' : 'Weight' };
  }

  return base;
};

export const formatSpecsForCopy = (specs, lang = 'kh', opts = {}) => {
  const labels = getVariantLabels(lang, { ...opts, sizeValue: specs.size });
  const parts = [];
  if (specs.size) parts.push(`${labels.size}: ${specs.size}`);
  if (specs.color) parts.push(`${labels.color}: ${specs.color}`);
  if (specs.weight) parts.push(`${labels.weight}: ${specs.weight}`);
  if (specs.height) parts.push(`${labels.height}: ${specs.height}`);
  if (specs.variant && !specs.size && !specs.color) parts.push(`${labels.variant}: ${specs.variant}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
};

export const CONFIRMED_PAYMENT_STATUSES = ['paid', 'processing', 'shipped', 'delivering', 'delivered'];

export const isPaymentConfirmed = (status) => CONFIRMED_PAYMENT_STATUSES.includes(status);

export const isUserPurchaseHistoryOrder = (status) => isPaymentConfirmed(status);
