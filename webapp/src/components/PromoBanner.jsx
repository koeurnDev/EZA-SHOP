import React, { useState, useEffect } from 'react';
import { useShopState, useShopDispatch } from '../context/ShopContext';

const PromoBanner = ({ threshold, promoText, promoBannerUrl, t, lang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Add pause state

  // Swipe State
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);
  const minSwipeDistance = 50;

  const { products } = useShopState();
  const { setSelectedProduct, setSelectedCategory, setView } = useShopDispatch();

  // Parse banners, format is url|type:targetId or just url
  const parsedBanners = promoBannerUrl ? promoBannerUrl.split(',').map(item => {
    const parts = item.trim().split('|');
    const url = parts[0];
    const targetStr = parts[1] || null;
    let linkType = null;
    let targetId = null;
    if (targetStr) {
      if (targetStr.startsWith('cat:')) { linkType = 'cat'; targetId = targetStr.substring(4); }
      else if (targetStr.startsWith('ext:')) { linkType = 'ext'; targetId = targetStr.substring(4); }
      else if (targetStr.startsWith('prod:')) { linkType = 'prod'; targetId = targetStr.substring(5); }
      else { linkType = 'prod'; targetId = targetStr; }
    }
    return { url, linkType, targetId };
  }).filter(b => b.url) : [];

  useEffect(() => {
    if (parsedBanners.length > 1 && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % parsedBanners.length);
      }, 3500); // Auto slide every 3.5 seconds
      return () => clearInterval(interval);
    }
  }, [parsedBanners.length, isPaused]);

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

    if (banner.linkType === 'prod' && products?.length) {
      const targetProduct = products.find(p => String(p.id) === String(banner.targetId));
      if (targetProduct) {
        setSelectedProduct(targetProduct);
      }
    } else if (banner.linkType === 'cat') {
      setSelectedCategory(banner.targetId);
      setView('browse');
    } else if (banner.linkType === 'ext') {
      window.open(banner.targetId, '_blank');
    }
  };

  if (parsedBanners.length > 0) {
    return (
      <div 
        className="ads-hero-container !px-0" 
        style={{ position: 'relative' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`ads-hero-wrapper !rounded-none`} style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', height: '100%', transition: 'transform 0.5s ease-in-out', transform: `translateX(-${currentIndex * 100}%)` }}>
             {parsedBanners.map((banner, idx) => (
                <div 
                  key={idx} 
                  style={{ flex: '0 0 100%', minWidth: '100%', height: '100%', position: 'relative', cursor: banner.linkType ? 'pointer' : 'default' }}
                  onClick={() => handleBannerClick(banner)}
                >
                  <img 
                    src={banner.url.includes('upload/') ? banner.url.replace('upload/', 'upload/f_auto,q_auto:best,c_limit,w_1920/') : banner.url} 
                    alt={`Banner ${idx + 1}`} 
                    className="ads-hero-img"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    crossOrigin="anonymous"
                    fetchpriority={idx === 0 ? "high" : "low"}
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </div>
             ))}
          </div>
        </div>
        
        {/* Slider Dots */}
        {parsedBanners.length > 1 && (
           <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {parsedBanners.map((_, idx) => (
                 <div 
                    key={idx} 
                    style={{ 
                       width: currentIndex === idx ? '18px' : '6px', 
                       height: '6px', 
                       borderRadius: '4px', 
                       background: currentIndex === idx ? '#2F483A' : 'rgba(255,255,255,0.7)',
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

  // Fallback if no banner URL
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
