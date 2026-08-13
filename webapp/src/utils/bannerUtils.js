/** Promo banner display specs — keep in sync with App.css (.ads-hero-wrapper) */
export const BANNER_SPECS = {
  designWidth: 1200,
  designHeight: 675,
  designRatio: '16:9',
  aspectRatio: '16 / 9',
  maxServeWidth: 1200,
  formats: 'JPG, PNG, WebP'
};

export function getBannerDesignSize(lang = 'kh') {
  const { designWidth, designHeight, designRatio, formats } = BANNER_SPECS;
  if (lang === 'kh') {
    return `📐 Design / Export: ${designWidth}×${designHeight} px (${designRatio}) · ${formats}`;
  }
  return `📐 Design / Export: ${designWidth}×${designHeight} px (${designRatio}) · ${formats}`;
}

export function getBannerSafeZoneHint(lang = 'kh') {
  if (lang === 'kh') {
    return '🎯 ដាក់អត្ថបទ/ឡូហ្គោកណ្ដាល — ជៀវខាងក្រៅអាចត្រូវ crop';
  }
  return '🎯 Keep text & logo centered — edges may crop (cover fill)';
}

export function getBannerDisplayNote(lang = 'kh') {
  if (lang === 'kh') {
    return 'បង្ហាញ: full-width 16:9 · phone + desktop ដូចគ្នា · fill edge-to-edge';
  }
  return 'Display: full-width 16:9 · same on phone & desktop · edge-to-edge fill';
}

/** Cloudinary banner — crop to 16:9 fill for crisp storefront display */
export function getOptimizedBannerUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('cloudinary.com')) return url;

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const base = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);
  const versionPath = rest.match(/(v\d+\/.+)$/)?.[1] || rest;
  const { designWidth, designHeight } = BANNER_SPECS;
  return `${base}f_auto,q_90,w_${designWidth},h_${designHeight},c_fill,g_center/${versionPath}`;
}

export function getBannerPreviewAspectRatio() {
  return BANNER_SPECS.aspectRatio;
}
