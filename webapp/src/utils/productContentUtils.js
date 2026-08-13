const SKINCARE_PATTERNS = [
  /skincare|skin care|beauty|cosmetic|គ្រឿងសំអាង|ស្បែក/i,
  /toner|serum|cream|lotion|cleanser|moisturizer|sunscreen|mask|essence|gel|wash|spf|retinol|vitamin c/i,
  /ទឹកអប់|ក្រែម|សារុំ|ម៉ាស|ថ្នាំលាប/i
];

const SECTION_MARKERS = {
  HOW_TO_USE: '[HOW_TO_USE]',
  INGREDIENTS: '[INGREDIENTS]'
};

export const isSkincareProduct = ({ category = '', name = '' } = {}) => {
  const haystack = `${category} ${name}`;
  return SKINCARE_PATTERNS.some((pattern) => pattern.test(haystack));
};

export const parseProductSections = (rawDescription = '') => {
  const text = String(rawDescription || '');
  let description = text;
  let howToUse = '';
  let ingredients = '';

  const howIdx = text.indexOf(SECTION_MARKERS.HOW_TO_USE);
  const ingIdx = text.indexOf(SECTION_MARKERS.INGREDIENTS);

  const cuts = [
    { key: 'howToUse', idx: howIdx, len: SECTION_MARKERS.HOW_TO_USE.length },
    { key: 'ingredients', idx: ingIdx, len: SECTION_MARKERS.INGREDIENTS.length }
  ]
    .filter((item) => item.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  if (cuts.length === 0) {
    return { description: description.trim(), howToUse, ingredients };
  }

  description = text.slice(0, cuts[0].idx).trim();

  cuts.forEach((cut, index) => {
    const start = cut.idx + cut.len;
    const end = cuts[index + 1] ? cuts[index + 1].idx : text.length;
    const value = text.slice(start, end).trim();
    if (cut.key === 'howToUse') howToUse = value;
    if (cut.key === 'ingredients') ingredients = value;
  });

  return { description, howToUse, ingredients };
};

export const SKINCARE_SECTION_HINT = `[HOW_TO_USE]
1. Cleanse face first
2. Apply a small amount
3. Use morning and night

[INGREDIENTS]
Water, Glycerin, ...`;
