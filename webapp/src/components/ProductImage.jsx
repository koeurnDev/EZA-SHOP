import React, { useEffect, useState } from 'react';
import { getProductCardImageUrl } from '../utils/imageUtils';

const PLACEHOLDER = '/favicon.png';

/**
 * Resilient product image: optimized URL first, raw Cloudinary fallback, then placeholder.
 */
const ProductImage = ({ url, alt = '', className = '', style, loading = 'lazy', width = 400 }) => {
  const rawUrl = url || '';
  const [src, setSrc] = useState(PLACEHOLDER);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!rawUrl) {
      setSrc(PLACEHOLDER);
      setStage(2);
      return;
    }
    setSrc(getProductCardImageUrl(rawUrl, width));
    setStage(0);
  }, [rawUrl, width]);

  const handleError = () => {
    if (stage === 0 && rawUrl) {
      setSrc(rawUrl);
      setStage(1);
      return;
    }
    setSrc(PLACEHOLDER);
    setStage(2);
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
};

export default ProductImage;
