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
        className="ads-hero-container relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ads-hero-wrapper relative overflow-hidden">
          <div 
            className="flex h-full transition-transform duration-500 ease-in-out" 
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {parsedBanners.map((banner, idx) => (
              <div
                key={`${banner.url}-${idx}`}
                className={`flex-[0_0_100%] min-w-full h-full relative ${banner.linkType && banner.targetId ? 'cursor-pointer' : 'cursor-default'}`}
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
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
            {parsedBanners.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-sm transition-all duration-300 ease-in-out cursor-pointer shadow-sm ${
                  currentIndex === idx ? 'w-[18px] bg-white/95' : 'w-[6px] bg-white/45'
                }`}
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
