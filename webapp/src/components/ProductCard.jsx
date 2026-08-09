import React, { useState, memo } from 'react';
import { getDiscountedPrice } from '../utils/discountUtils';
import { useUser } from '../context/UserContext';
import { useTelegram } from '../context/TelegramContext';
import { formatCategory } from '../utils/langUtils';
import { useShopDispatch } from '../context/ShopContext';

const ProductCard = memo(({ 
  product, onAdd, onViewProduct, discountLookup = {}, 
  variant = 'grid'
}) => {
  const { t, lang } = useUser();
  const { tg } = useTelegram();
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { showToast } = useShopDispatch();

  const isOutOfStock = product.stock <= 0;

  const handleClick = () => {
    if (isOutOfStock) return;
    onViewProduct(product);
  };

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (tg?.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }
    setIsAdded(true);
    onAdd(product, e);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const getOptimizedImage = (url) => {
    if (!url || !url.includes('cloudinary')) return url || '';
    return url.replace('/upload/', '/upload/f_auto,q_auto:eco,w_400,h_400,c_fill,g_auto/');
  };

  const bestDiscount = discountLookup[product.id] || discountLookup['all'] || null;
  const hasFlashSale = product.flash_sale_price && product.flash_sale_end && new Date(product.flash_sale_end) > new Date();
  const finalPrice = hasFlashSale ? product.flash_sale_price : getDiscountedPrice(product, bestDiscount);
  const isDiscounted = hasFlashSale || bestDiscount !== null || finalPrice < product.price;

  // Short badge text for the top left (e.g. New, Special, Category)
  let badgeText = formatCategory(product.category, lang) || 'ពិសេស';
  if (badgeText.length > 12) {
      badgeText = badgeText.substring(0, 12) + '...';
  }

  let hasMultipleImages = false;
  try {
    if (product.additional_images) {
      const parsed = typeof product.additional_images === 'string' ? JSON.parse(product.additional_images) : product.additional_images;
      if (Array.isArray(parsed) && parsed.length > 0) hasMultipleImages = true;
    }
  } catch(e) {}

  return (
    <div
      className={`product-card-standard-green ${isOutOfStock ? 'pc-out-of-stock' : ''}`}
      onClick={handleClick}
    >
      {/* Multiple Images Indicator (Instagram style) */}
      {hasMultipleImages && (
        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)', color: 'white' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="14" height="14" rx="2" ry="2"></rect>
            <path d="M7 21h12a2 2 0 0 0 2-2V7"></path>
          </svg>
        </div>
      )}
      
      {/* Flash Sale Tag */}
      {hasFlashSale && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', zIndex: 10 }}>
           SALE
        </div>
      )}

      {/* Image Wrapper */}
      <div className="standard-image-wrapper">
        <img
          src={getOptimizedImage(product.image)}
          alt={product.name}
          className="standard-card-img"
          loading="lazy"
          decoding="async"
          crossOrigin="anonymous"
        />
      </div>
      
      {/* Content Below Image */}
      <div className="standard-card-content">
        <h3 className="standard-card-title">{product.name}</h3>
        <div className="standard-card-bottom">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="standard-card-price" style={isDiscounted ? { color: '#ef4444' } : {}}>${finalPrice}</span>
            {isDiscounted && <span style={{ textDecoration: 'line-through', fontSize: '11px', color: '#999', marginTop: '-2px' }}>${product.price}</span>}
          </div>
          {!isOutOfStock && (
            <button 
              className={`standard-add-btn ${isAdded ? 'added' : ''}`}
              onClick={handleQuickAdd}
            >
              {isAdded ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
