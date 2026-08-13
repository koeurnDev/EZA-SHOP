export const getOptimizedThumbUrl = (url, width = 80) => {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const base = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);
  const versionPath = rest.match(/(v\d+\/.+)$/)?.[1] || rest;
  return `${base}f_auto,q_auto,w_${width},h_${width},c_fill,g_auto/${versionPath}`;
};

/** Main image, or first additional_images entry as fallback */
export const resolveProductImageUrl = (product) => {
  if (product?.image) return product.image;
  try {
    const raw = product?.additional_images;
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(list) && list[0]) return list[0];
  } catch { /* ignore */ }
  return '';
};

const reportedBroken = new Set();

const BROKEN_STORAGE_KEY = 'momo_broken_images_v2';

const loadPersistedBroken = () => {
  try {
    const raw = localStorage.getItem(BROKEN_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list)) list.forEach((url) => reportedBroken.add(url));
  } catch { /* ignore */ }
};

const persistBroken = (url) => {
  try {
    const list = [...reportedBroken].slice(-100);
    localStorage.setItem(BROKEN_STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
};

// Skip loading persisted broken URLs (caused false blocks after image incident)
// loadPersistedBroken();

/** Prefer raw Cloudinary URL — transforms can fail in some WebViews */
export const getProductCardImageUrl = (url, width = 400) => {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;
  return getOptimizedThumbUrl(url, width);
};

const extractAssetKey = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const match = String(url).match(/\/v\d+\/(.+)$/);
  return match ? match[1] : null;
};

export const isKnownBrokenImage = (url) => {
  if (!url) return false;
  const assetKey = extractAssetKey(url);
  if (reportedBroken.has(url)) return true;
  if (assetKey && reportedBroken.has(assetKey)) return true;
  if (!assetKey) return false;
  for (const broken of reportedBroken) {
    const brokenKey = extractAssetKey(broken) || broken;
    if (brokenKey === assetKey) return true;
  }
  return false;
};

/** Report a Cloudinary 404 so the backend marks cache (does not wipe DB) */
export const reportBrokenImageUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return;
  const assetKey = extractAssetKey(url) || url;
  if (reportedBroken.has(assetKey)) return;
  reportedBroken.add(assetKey);
  persistBroken(assetKey);

  const backend = import.meta.env.VITE_BACKEND_URL || '';
  if (!backend) return;

  fetch(`${backend}/api/images/report-broken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).catch(() => {});
};

export const handleImageError = (e, fallback = '/favicon.png', originalUrl, shouldReport = false) => {
  if (!e?.target) return;
  e.target.onerror = null;

  const failedUrl = originalUrl || e.target.dataset?.originalSrc || e.target.src;
  if (shouldReport) reportBrokenImageUrl(failedUrl);

  if (e.target.src !== fallback) e.target.src = fallback;
};

export const resolveItemImageUrl = (item, productById) => {
  const id = item?.id ?? item?.product_id;
  if (id != null && productById) {
    const product = productById.get(String(id));
    if (product?.image) return product.image;
    if (product && !product.image) return '';
  }

  const direct = item?.image || item?.product_image || item?.thumbnail;
  if (direct && isKnownBrokenImage(direct)) return '';
  return direct || '';
};

export const compressImage = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // If not an image (e.g. video), return original
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Keep original format or fallback to jpeg
        const outFormat = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: outFormat,
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          outFormat,
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const uploadMultipleImages = async (files, { compressImage, fetchWithRetry, uploadUrl, headers }) => {
  const uploaded = [];
  for (const file of files) {
    if (!file?.type?.startsWith('image/')) continue;
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('image', compressed);
    const res = await fetchWithRetry(uploadUrl, { method: 'POST', headers, body: fd });
    if (res.success && res.data?.url) uploaded.push(res.data.url);
  }
  return uploaded;
};
