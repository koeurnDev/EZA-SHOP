import { isKnownBrokenImage } from './imageUtils';

const RECENT_KEY = 'momo_recent_searches';
const MAX_RECENT = 8;

export const normalizeSearchText = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

export const productMatchesSearch = (product, query) => {
  const q = normalizeSearchText(query);
  if (!q) return true;

  const haystack = normalizeSearchText(
    [product?.name, product?.category, product?.description, product?.id]
      .filter(Boolean)
      .join(' ')
  );

  return q.split(' ').filter(Boolean).every((token) => haystack.includes(token));
};

export const getSearchSuggestions = (products, query, limit = 5) => {
  const q = normalizeSearchText(query);
  if (!q) return [];

  return (products || [])
    .filter((p) => (parseInt(p.stock, 10) || 0) > 0)
    .filter((p) => !isKnownBrokenImage(p.image))
    .map((p) => {
      const name = normalizeSearchText(p.name);
      let score = 0;
      if (name.startsWith(q)) score += 10;
      else if (name.includes(q)) score += 6;
      if (productMatchesSearch(p, q)) score += 4;
      return { product: p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.product);
};

export const getRecentSearches = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(Boolean).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

export const addRecentSearch = (term) => {
  const q = normalizeSearchText(term);
  if (q.length < 2) return;
  const prev = getRecentSearches().filter((s) => normalizeSearchText(s) !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
};

export const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_KEY);
};
