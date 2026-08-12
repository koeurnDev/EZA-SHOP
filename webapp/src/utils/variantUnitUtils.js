export const VARIANT_UNIT = {
  LITER: 'liter',
  WEIGHT: 'weight',
  SHOE: 'shoe',
  SHOE_US: 'shoe_us',
  CLOTHING: 'clothing'
};

const LITER_PATTERNS = [
  /beauty|skincare|គ្រឿងសំអាង/i,
  /sarom|សារ|សាប៊ូ|shampoo|lotion|detergent|liquid|ទឹក|perfume|ទឹកអប់|soap|cream|toner|serum|gel|wash|conditioner/i
];

const WEIGHT_PATTERNS = [
  /fruit|vegetable|food|meat|grain|rice|grocer|fresh|organic|produce/i,
  /បន្លែ|ផ្លែ|គ្រាប់|សាច់|ទម្ងន់|គ្រឿងទេស|snack|nut|coffee|tea/i
];

const SHOE_PATTERNS = [
  /shoes|footwear|sneaker|sandal|boot|ស្បែកជើង/i
];

const SHOE_US_PATTERNS = [
  /\buk\b|\bus\b|american|british|អាមេរិក|អង់គ្លេស/i
];

const CLOTHING_PATTERNS = [
  /clothes|bags|accessories|សម្លៀក|កាបូប/i
];

export const LITER_QUICK_PRESETS = ['500ml', '750ml', '1L', '1.5L', '2L', '3L', '5L', '10L'];
export const WEIGHT_QUICK_PRESETS = ['250g', '500g', '1kg', '2kg', '5kg', '10kg'];
export const SHOE_QUICK_PRESETS = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
export const SHOE_US_QUICK_PRESETS = ['5', '6', '7', '8', '9', '10', '11', '12'];
export const CLOTHING_QUICK_PRESETS = ['Free Size', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export const isLiterVolumeValue = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  return /^\d+(\.\d+)?\s*(ml|mL|l|L|លីត)/i.test(text);
};

export const isWeightValue = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  return /^\d+(\.\d+)?\s*(g|kg|gram|grams|kilogram|kilograms|ក្រាម|គីឡូ)/i.test(text);
};

export const isShoeSizeValue = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  if (!/^\d{2}$/.test(text)) return false;
  const num = Number(text);
  return num >= 35 && num <= 46;
};

export const isUsShoeSizeValue = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  if (!/^\d{1,2}(\.5)?$/.test(text)) return false;
  const num = Number(text);
  return num >= 4 && num <= 13;
};

export const isClothingSizeValue = (value) => {
  if (!value) return false;
  const text = String(value).trim();
  return /^(free\s*size|one\s*size|ទំហំតែមួយ|XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL|5XL)$/i.test(text);
};

export const getVariantUnitMode = ({
  category = '',
  productName = '',
  variantSizes = []
} = {}) => {
  const haystack = `${category} ${productName}`;

  if (SHOE_PATTERNS.some((pattern) => pattern.test(haystack))) {
    if (SHOE_US_PATTERNS.some((pattern) => pattern.test(haystack))) {
      return VARIANT_UNIT.SHOE_US;
    }
    return VARIANT_UNIT.SHOE;
  }

  if (WEIGHT_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return VARIANT_UNIT.WEIGHT;
  }

  if (LITER_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return VARIANT_UNIT.LITER;
  }

  if (CLOTHING_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return VARIANT_UNIT.CLOTHING;
  }

  const sizes = variantSizes.filter(Boolean).map(String);
  if (sizes.length > 0) {
    if (sizes.every(isLiterVolumeValue)) return VARIANT_UNIT.LITER;
    if (sizes.every(isWeightValue)) return VARIANT_UNIT.WEIGHT;
    if (sizes.every(isUsShoeSizeValue)) return VARIANT_UNIT.SHOE_US;
    if (sizes.every(isShoeSizeValue)) return VARIANT_UNIT.SHOE;
    if (sizes.every(isClothingSizeValue)) return VARIANT_UNIT.CLOTHING;
  }

  return VARIANT_UNIT.CLOTHING;
};

export const getQuickPresets = (unitMode) => {
  if (unitMode === VARIANT_UNIT.LITER) return LITER_QUICK_PRESETS;
  if (unitMode === VARIANT_UNIT.WEIGHT) return WEIGHT_QUICK_PRESETS;
  if (unitMode === VARIANT_UNIT.SHOE_US) return SHOE_US_QUICK_PRESETS;
  if (unitMode === VARIANT_UNIT.SHOE) return SHOE_QUICK_PRESETS;
  return CLOTHING_QUICK_PRESETS;
};

export const getCapacityLabel = (lang, unitMode) => {
  if (unitMode === VARIANT_UNIT.LITER) {
    return lang === 'kh' ? 'លីត្រ' : 'Volume';
  }
  if (unitMode === VARIANT_UNIT.WEIGHT) {
    return lang === 'kh' ? 'ទម្ងន់' : 'Weight';
  }
  return lang === 'kh' ? 'ទំហំ' : 'Size';
};

export const getCapacityIcon = (unitMode) => {
  if (unitMode === VARIANT_UNIT.LITER) return '🧴';
  if (unitMode === VARIANT_UNIT.WEIGHT) return '⚖️';
  if (unitMode === VARIANT_UNIT.SHOE || unitMode === VARIANT_UNIT.SHOE_US) return '👟';
  return '📏';
};

export const getVariantPanelMeta = (lang, unitMode) => {
  if (unitMode === VARIANT_UNIT.LITER) {
    return {
      icon: '🧴',
      titleKh: 'ជម្រើសលីត្រ, ពណ៌ និង ស្តុក',
      titleEn: 'Volume, color & stock',
      quickKh: 'ចុចថែមលីត្រលឿន',
      quickEn: 'Quick add volume',
      placeholderKh: 'លីត្រ (ឧ. 1L, 500ml)',
      placeholderEn: 'Volume (e.g. 1L, 500ml)'
    };
  }

  if (unitMode === VARIANT_UNIT.WEIGHT) {
    return {
      icon: '⚖️',
      titleKh: 'ជម្រើសទម្ងន់, ពណ៌ និង ស្តុក',
      titleEn: 'Weight, color & stock',
      quickKh: 'ចុចថែមទម្ងន់លឿន',
      quickEn: 'Quick add weight',
      placeholderKh: 'ទម្ងន់ (ឧ. 1kg, 500g)',
      placeholderEn: 'Weight (e.g. 1kg, 500g)'
    };
  }

  if (unitMode === VARIANT_UNIT.SHOE_US) {
    return {
      icon: '👟',
      titleKh: 'ជម្រើសទំហំស្បែកជើង (US/UK), ពណ៌ និង ស្តុក',
      titleEn: 'US/UK shoe size, color & stock',
      quickKh: 'ចុចថែមទំហំ US/UK លឿន',
      quickEn: 'Quick add US/UK shoe size',
      placeholderKh: 'ទំហំ (ឧ. 8, 9, 10)',
      placeholderEn: 'Size (e.g. 8, 9, 10)'
    };
  }

  if (unitMode === VARIANT_UNIT.SHOE) {
    return {
      icon: '👟',
      titleKh: 'ជម្រើសទំហំស្បែកជើង (EU), ពណ៌ និង ស្តុក',
      titleEn: 'EU shoe size, color & stock',
      quickKh: 'ចុចថែមទំហំ EU លឿន',
      quickEn: 'Quick add EU shoe size',
      placeholderKh: 'ទំហំ (ឧ. 39, 40)',
      placeholderEn: 'Size (e.g. 39, 40)'
    };
  }

  return {
    icon: '👕',
    titleKh: 'ជម្រើសទំហំ, ពណ៌ និង ស្តុក',
    titleEn: 'Size, color & stock',
    quickKh: 'ចុចថែម Size លឿន',
    quickEn: 'Quick add size',
    placeholderKh: 'ទំហំ (ឧ. M, L, Free Size)',
    placeholderEn: 'Size (e.g. M, L, Free Size)'
  };
};

export const getSelectionPrompt = (lang, { unitMode, needsColor, needsCapacity }) => {
  const parts = [];
  if (needsCapacity) parts.push(getCapacityLabel(lang, unitMode));
  if (needsColor) parts.push(lang === 'kh' ? 'ពណ៌' : 'Color');

  if (!parts.length) return '';

  if (lang === 'kh') {
    return `សូមជ្រើសរើស${parts.join(' និង ')}សិន`;
  }

  return `Please select ${parts.join(' and ')} first`;
};
