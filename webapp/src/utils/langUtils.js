export const formatCategory = (category, lang) => {
  if (!category) return "";
  const baseCategory = String(category).split('||')[0]; // Handle grouped categories
  if (lang === "kh") return baseCategory.replace(/\s*\(.*?\)/g, "");
  const match = baseCategory.match(/\((.*?)\)/);
  return match ? match[1] : baseCategory.replace(/\s*\(.*?\)/g, "");
};

export const getCategoryBucket = (category) => {
  if (!category) return 'others';
  const lower = String(category).toLowerCase();
  
  if (lower.includes('bags') || lower.includes('accessory') || lower.includes('កាបូប') || lower.includes('អលង្ការ')) return 'accessories';
  if (lower.includes('beauty') || lower.includes('care') || lower.includes('គ្រឿងសម្អាង') || lower.includes('សម្រស់') || lower.includes('គ្រឿងសំអាង')) return 'beauty';
  if (lower.includes('electronic') || lower.includes('អេឡិចត្រូនិក') || lower.includes('ទូរស័ព្ទ')) return 'electronics';
  if (lower.includes('fashion') || lower.includes('shoe') || lower.includes('សម្លៀកបំពាក់') || lower.includes('ខោអាវ') || lower.includes('ស្បែកជើង')) return 'fashion';
  if (lower.includes('gift') || lower.includes('gadget') || lower.includes('កាដូ')) return 'gifts';
  if (lower.includes('home') || lower.includes('living') || lower.includes('ផ្ទះ')) return 'home';
  if (lower.includes('promo') || lower.includes('sale') || lower.includes('បញ្ចុះតម្លៃ') || lower.includes('ប្រូម៉ូសិន')) return 'promo';

  return 'others';
};

export const PREDEFINED_CATEGORIES = [
  { id: 'fashion', kh: 'សម្លៀកបំពាក់', en: 'Fashion' },
  { id: 'beauty', kh: 'គ្រឿងសម្អាង', en: 'Beauty' },
  { id: 'electronics', kh: 'អេឡិចត្រូនិក', en: 'Electronics' },
  { id: 'home', kh: 'ផ្ទះ', en: 'Home' },
  { id: 'accessories', kh: 'កាបូប & អលង្ការ', en: 'Bags & Accessories' },
  { id: 'gifts', kh: 'កាដូ', en: 'Gifts' },
  { id: 'promo', kh: 'ប្រូម៉ូសិន', en: 'Promo & Sale' }
];
