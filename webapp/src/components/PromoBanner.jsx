import React, { useState, useEffect } from 'react';

const PromoBanner = ({ threshold, promoText, promoBannerUrl, t, lang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // If we have a banner URL, we'll use it. We also add a couple of placeholder premium banners 
  // to demonstrate the auto-slider if there's only one.
  const banners = promoBannerUrl ? promoBannerUrl.split(',').map(url => url.trim()) : [];
  
  // Add some fallback banners if the user only has 1 or 0 banners to show the slider effect
  if (banners.length === 1) {
     banners.push('https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&q=80&w=800'); // Cosmetic placeholder 1
     banners.push('https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=800'); // Cosmetic placeholder 2
  } else if (banners.length === 0) {
     // No banners at all, maybe don't show the image slider, or show defaults.
     // But original code showed text promo if no banner.
  }

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
      }, 3500); // Auto slide every 3.5 seconds
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  if (banners.length > 0) {
    return (
      <div className="ads-hero-container !px-0" style={{ position: 'relative' }}>
        <div className={`ads-hero-wrapper !rounded-none`} style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', height: '100%', transition: 'transform 0.5s ease-in-out', transform: `translateX(-${currentIndex * 100}%)` }}>
             {banners.map((url, idx) => (
                <div key={idx} style={{ flex: '0 0 100%', minWidth: '100%', height: '100%', position: 'relative' }}>
                  <img 
                    src={url.includes('upload/') ? url.replace('upload/', 'upload/f_auto,q_auto:best,w_800/') : url} 
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
        {banners.length > 1 && (
           <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {banners.map((_, idx) => (
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
