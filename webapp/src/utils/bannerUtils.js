/** Promo banner display specs — keep in sync with App.css (.ads-hero-wrapper) */
export const BANNER_SPECS = {
  /** Export this size — one file for desktop + mobile */
  designWidth: 1200,
  designHeight: 675,
  designRatio: '16:9',
  /** Keep logo / headline inside this centered area (mobile frame is 4:3) */
  safeZoneWidth: 900,
  safeZoneHeight: 675,
  safeZoneRatio: '4:3',
  aspectDesktop: '16 / 9',
  aspectMobile: '4 / 3',
  maxServeWidth: 1000,
  formats: 'JPG, PNG, WebP'
};

/** Primary line for admin — what to export from Figma/Canva */
export function getBannerDesignSize(lang = 'kh') {
  const { designWidth, designHeight, designRatio, formats } = BANNER_SPECS;
  if (lang === 'kh') {
    return `📐 Design / Export: ${designWidth}×${designHeight} px (${designRatio}) · ${formats}`;
  }
  return `📐 Design / Export: ${designWidth}×${designHeight} px (${designRatio}) · ${formats}`;
}

/** Safe zone — where to place text so mobile does not feel empty */
export function getBannerSafeZoneHint(lang = 'kh') {
  const { safeZoneWidth, safeZoneHeight, safeZoneRatio } = BANNER_SPECS;
  if (lang === 'kh') {
    return `🎯 Safe zone (ខ្លឹមកណ្ដាល): ${safeZoneWidth}×${safeZoneHeight} px (${safeZoneRatio}) — ដាក់អត្ថបទ/ឡូហ្គោនៅក្នុងនេះ`;
  }
  return `🎯 Safe zone (center): ${safeZoneWidth}×${safeZoneHeight} px (${safeZoneRatio}) — keep text & logo here`;
}

/** How the app displays the same file */
export function getBannerDisplayNote(lang = 'kh') {
  if (lang === 'kh') {
    return 'បង្ហាញ: full-width · Desktop 16:9 · Phone frame 4:3 (រូបដដែល — object-fit contain)';
  }
  return 'Display: full-width · Desktop 16:9 · Phone frame 4:3 (same file — object-fit contain)';
}

/** @deprecated use getBannerDesignSize + getBannerSafeZoneHint */
export function getBannerSizeHint(lang = 'kh') {
  return `${getBannerDesignSize(lang)} · ${getBannerSafeZoneHint(lang)}`;
}

export function getBannerPreviewAspectRatio() {
  return BANNER_SPECS.aspectDesktop;
}
