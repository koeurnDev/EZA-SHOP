import React, { useState, useEffect } from 'react';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { getOptimizedBannerUrl } from '../utils/bannerUtils';
import { parseBannerEntries } from '../utils/bannerLinkUtils';

const PromoBanner = ({ threshold, promoText, promoBannerUrl, t, lang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const minSwipeDistance = 50;

  const { products } = useShopState();
  const { setSelectedProduct, setSelectedCategory, setView } = useShopDispatch();

  const parsedBanners = parseBannerEntries(promoBannerUrl);

  useEffect(() => {
    if (parsedBanners.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % parsedBanners.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [parsedBanners.length, isPaused]);

  useEffect(() => {
    if (currentIndex >= parsedBanners.length) {
      setCurrentIndex(0);
    }
  }, [parsedBanners.length, currentIndex]);

  const handleTouchStart = (e) => {
    setIsPaused(true);
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX || !touchEndX) return;

    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && parsedBanners.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % parsedBanners.length);
    } else if (isRightSwipe && parsedBanners.length > 1) {
      setCurrentIndex((prev) => (prev === 0 ? parsedBanners.length - 1 : prev - 1));
    }
  };

  const handleBannerClick = (banner) => {
    if (!banner.linkType || !banner.targetId) return;

    if (banner.linkType === 'prod') {
      const targetProduct = products?.find((p) => String(p.id) === String(banner.targetId));
      if (targetProduct) {
        setSelectedProduct(targetProduct);
        setView('product_detail');
      }
    } else if (banner.linkType === 'cat') {
      setSelectedCategory(banner.targetId);
      setView('browse');
    } else if (banner.linkType === 'ext') {
      const href = banner.targetId.startsWith('http') ? banner.targetId : `https://${banner.targetId}`;
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  if (parsedBanners.length > 0) {
    return (
      <div
        className="ads-hero-container"
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ads-hero-wrapper" style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', height: '100%', transition: 'transform 0.5s ease-in-out', transform: `translateX(-${currentIndex * 100}%)` }}>
            {parsedBanners.map((banner, idx) => (
              <div
                key={`${banner.url}-${idx}`}
                style={{ flex: '0 0 100%', minWidth: '100%', height: '100%', position: 'relative', cursor: banner.linkType && banner.targetId ? 'pointer' : 'default' }}
                onClick={() => handleBannerClick(banner)}
              >
                <img
                  src={getOptimizedBannerUrl(banner.url)}
                  alt={`Banner ${idx + 1}`}
                  className="ads-hero-img"
                  fetchpriority={idx === 0 ? 'high' : 'low'}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
        </div>

        {parsedBanners.length > 1 && (
          <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
            {parsedBanners.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: currentIndex === idx ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '4px',
                  background: currentIndex === idx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="promo-banner-container">
      <div className="promo-banner-luxury animate-in">
        <div className="promo-pill">
          <span className="promo-icon">🚚</span>
          <span className="promo-text">
            {promoText || (lang === 'en' ? `Free Delivery on orders over $${threshold}` : `ដឹកជញ្ជូនឥតគិតថ្លៃរាល់ការកុម្មង់ចាប់ពី $${threshold} ឡើងទៅ`)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PromoBanner);
