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

export const handleImageError = (e, fallback = '/favicon.png') => {
  if (!e?.target) return;
  e.target.onerror = null;
  if (e.target.src !== fallback) e.target.src = fallback;
};

export const resolveItemImageUrl = (item, productById) => {
  const direct = item?.image || item?.product_image || item?.thumbnail;
  if (direct) return direct;
  const id = item?.id ?? item?.product_id;
  if (id != null && productById) {
    const product = productById.get(String(id));
    if (product?.image) return product.image;
  }
  return '';
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
