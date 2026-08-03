import React, { useState } from 'react';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';

/**
 * 💎 ProductDetail — Matches reference screenshot (COSRX style)
 * Clean white sheet, floating image, info rows, green sticky footer
 */
const ProductDetail = ({ product, allProducts = [], onAdd, onClose, onBuyNow, activeDiscounts = [], t, lang, shopLogoUrl, isFavorited = false, onToggleWishlist, onSelectRelated }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  
  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const scrollRef = React.useRef(null);
  const mainScrollRef = React.useRef(null);
  const scrollTimeoutRef = React.useRef(null);

  // Full Product Lazy Load
  const [fullProduct, setFullProduct] = useState(product);
  const [loadingFullProduct, setLoadingFullProduct] = useState(false);

  React.useEffect(() => {
    setQuantity(1);
    setActiveImg(0);
    setFullProduct(product); // Reset when product changes
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    
    // Fetch Reviews & Full Product
    if (product?.id) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3005';
      
      setLoadingReviews(true);
      fetch(`${BACKEND_URL}/api/products/${product.id}/reviews`)
        .then(res => res.json())
        .then(data => { if (data.success) setReviews(data.reviews || []); })
        .catch(console.error)
        .finally(() => setLoadingReviews(false));
        
      setLoadingFullProduct(true);
      fetch(`${BACKEND_URL}/api/products/${product.id}`)
        .then(res => res.json())
        .then(data => { if (data.success) setFullProduct({ ...product, ...data.product }); })
        .catch(console.error)
        .finally(() => setLoadingFullProduct(false));
    }
  }, [product]);

  const handleSubmitReview = async () => {
    if (!newReviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3005';
      const initData = window.Telegram?.WebApp?.initData || '';
      
      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `tma ${initData}` },
        body: JSON.stringify({
          productId: product.id,
          rating: newReviewRating,
          comment: newReviewText
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviews([data.review, ...reviews]);
        setNewReviewText('');
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product) return null;

  const gallery = React.useMemo(() => [
    fullProduct.image,
    ...(typeof fullProduct.additional_images === 'string'
      ? JSON.parse(fullProduct.additional_images || '[]')
      : (fullProduct.additional_images || []))
  ].filter(img => img && typeof img === 'string'), [fullProduct.image, fullProduct.additional_images]);

  const bestDiscount = calculateBestDiscount(product, activeDiscounts);
  const discountedPriceValue = getDiscountedPrice(product, bestDiscount);
  const isDiscounted = bestDiscount !== null;
  const isOutOfStock = product.stock <= 0;

  const hasReviews = product.review_count && product.review_count > 0;

  const relatedProducts = allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 8);

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (product.stock > 0 && quantity > product.stock) {
      alert(lang === 'kh' ? `សុំទោស! ទំនិញនេះមានក្នុងស្តុកតែ ${product.stock} ប៉ុណ្ណោះ` : `Sorry, only ${product.stock} in stock`);
      return;
    }
    
    // Add to cart with correct quantity by reusing handleAdd logic
    if (!isOutOfStock) {
      for (let i = 0; i < quantity; i++) { onAdd(product, e); }
    }
    
    // Trigger navigation to cart
    if (typeof onBuyNow === 'function') onBuyNow(e);
  };

  const handleAdd = (e) => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) { onAdd(product, e); }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  return (
    <div className="pd-overlay">
      <div className="pd-sheet">

        {/* Drag handle */}
        <div className="pd-drag-handle" onClick={onClose} />

        {/* Scrollable content */}
        <div className="pd-scroll" ref={mainScrollRef}>

          {/* Image Gallery */}
          <div className="pd-image-section-wrapper">
            {/* Floating Nav */}
            <div className="pd-floating-nav">
              <button className="pd-floating-btn" onClick={onClose} aria-label="Back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="pd-floating-btn" onClick={(e) => {
                  e.stopPropagation();
                  const tg = window.Telegram?.WebApp;
                  const shareText = `🔥 មើលនេះសិន! ${product.name} លក់ត្រឹមតែ $${product.price} នៅ MO MO Boutique! 👗`;
                  if (tg?.openTelegramLink) {
                    tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent('https://t.me/mo_mo_boutique_bot')}&text=${encodeURIComponent(shareText)}`);
                  }
                }} aria-label="Share">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
                <button className="pd-floating-btn" onClick={(e) => { e.stopPropagation(); if (typeof onBuyNow === 'function') onBuyNow(e); }} aria-label="Cart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </button>
              </div>
            </div>
            <div className="pd-image-area">
              <div
                className="pd-swiper"
                ref={scrollRef}
                onScroll={(e) => {
                  if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                  scrollTimeoutRef.current = setTimeout(() => {
                    if (!scrollRef.current) return;
                    const target = scrollRef.current;
                    const idx = Math.round(target.scrollLeft / target.offsetWidth);
                    setActiveImg(prev => (idx !== prev ? idx : prev));
                  }, 50);
                }}
              >
                {gallery.map((img, i) => (
                  <div key={i} className="pd-slide">
                    <img
                      src={(img && img.includes('cloudinary'))
                        ? img.replace('upload/', 'upload/f_auto,q_auto,w_800,c_pad,b_white/')
                        : img}
                      alt={`${product.name} ${i + 1}`}
                      className="pd-slide-img"
                      crossOrigin="anonymous"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding={i === 0 ? "sync" : "async"}
                      fetchpriority={i === 0 ? "high" : "auto"}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 📸 GALLERY THUMBNAILS — The primary navigation now */}
            {gallery.length > 1 && (
              <div className="pd-thumbnails-row">
                {gallery.map((img, i) => (
                  <div 
                    key={i} 
                    className={`pd-thumb-item ${i === activeImg ? 'active' : ''}`}
                    onClick={() => {
                      scrollRef.current?.scrollTo({ left: i * scrollRef.current.offsetWidth, behavior: 'smooth' });
                      setActiveImg(i);
                    }}
                  >
                    <img 
                      src={img.includes('cloudinary') ? img.replace('upload/', 'upload/f_auto,q_auto,w_200,c_fill,g_auto/') : img} 
                      alt="" 
                      crossOrigin="anonymous" 
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Content */}
          <div className="pd-content">

            {/* Brand */}
            <p className="pd-brand">{product.category || 'MO MO Boutique'}</p>

            {/* Product Name */}
            <h1 className="pd-name">{product.name}</h1>

            {/* Star Rating */}
            {hasReviews && (
              <div className="pd-rating-row">
                <span className="pd-star">★</span>
                <span className="pd-rating-val">{parseFloat(product.avg_rating).toFixed(1)}</span>
                <span className="pd-rating-count">({product.review_count.toLocaleString()} Reviews)</span>
              </div>
            )}

            {/* Price and Quantity */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
              <div className="pd-price-row" style={{ margin: 0 }}>
                <span className="pd-price-now" style={isDiscounted ? { color: '#ef4444' } : {}}>${discountedPriceValue} USD</span>
                {isDiscounted && (
                  <>
                    <span className="pd-price-was" style={{ textDecoration: 'line-through', color: '#999' }}>${product.price} USD</span>
                    <span className="pd-pct-badge" style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginLeft: '8px' }}>
                      -{bestDiscount.value}{bestDiscount.discount_type === 'percent' ? '%' : '$'}
                    </span>
                  </>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                 <button onClick={() => setQuantity(prev => (prev > 1 ? prev - 1 : 1))} className="pd-qty-btn"
                   style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', cursor: 'pointer' }}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
                 </button>
                 <span style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
                 <button 
                   onClick={() => setQuantity(prev => prev + 1)} 
                   style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--primary-accent)', color: 'white', cursor: 'pointer' }}
                 >
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 </button>
              </div>
            </div>

            {/* Info rows */}
            <div className="pd-info-rows">
              <div className="pd-info-row">
                <span className={`pd-stock-icon ${isOutOfStock ? 'out' : ''}`}>●</span>
                <span className={`pd-info-text ${isOutOfStock ? '' : 'green'}`}>
                  {isOutOfStock
                    ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of stock')
                    : (lang === 'kh' ? `មានស្តុក (${product.stock})` : `In stock (${product.stock})`)}
                </span>
              </div>
            </div>

            {/* Description */}
            {loadingFullProduct ? (
              <div style={{ padding: '15px 0' }}>
                 <div className="skeleton-pulse" style={{ height: 14, width: '100%', marginBottom: 8, borderRadius: 4, background: 'var(--border-subtle)' }} />
                 <div className="skeleton-pulse" style={{ height: 14, width: '90%', marginBottom: 8, borderRadius: 4, background: 'var(--border-subtle)' }} />
                 <div className="skeleton-pulse" style={{ height: 14, width: '70%', borderRadius: 4, background: 'var(--border-subtle)' }} />
              </div>
            ) : fullProduct.description && (
              <p className="pd-desc">{fullProduct.description}</p>
            )}

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="pd-related-section" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '16px', color: 'var(--text-main)' }}>
                  {lang === 'kh' ? 'ផលិតផលស្រដៀងគ្នា' : 'You might also like'}
                </h3>
                <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '16px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                  {relatedProducts.map(rp => (
                    <div 
                      key={rp.id} 
                      onClick={() => {
                        if (onSelectRelated) onSelectRelated(rp);
                      }}
                      style={{ minWidth: '120px', width: '120px', cursor: 'pointer', background: 'var(--bg-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-soft)' }}>
                        <img 
                          src={(rp.image && rp.image.includes('cloudinary')) ? rp.image.replace('upload/', 'upload/f_auto,q_auto,w_200,c_fill,g_auto/') : rp.image} 
                          alt={rp.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{rp.name}</div>
                        <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary-accent)' }}>${rp.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <style>{`.pd-related-section ::-webkit-scrollbar { display: none; }`}</style>
              </div>
            )}

            {/* Reviews Section */}
            <div className="pd-reviews-section" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'var(--text-main)' }}>
                  {lang === 'kh' ? 'ការវាយតម្លៃអតិថិជន' : 'Customer Reviews'}
                </h3>
                {!showReviewForm && (
                  <button 
                    onClick={() => setShowReviewForm(true)}
                    style={{ background: 'var(--primary-gradient)', color: 'white', padding: '6px 16px', borderRadius: '100px', fontWeight: '800', border: 'none', fontSize: '13px' }}
                  >
                    {lang === 'kh' ? 'សរសេរការវាយតម្លៃ' : 'Write Review'}
                  </button>
                )}
              </div>
              
              {/* Add Review Form */}
              {showReviewForm && (
                <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
                    {[1,2,3,4,5].map(star => (
                      <span 
                        key={star} 
                        onClick={() => setNewReviewRating(star)}
                        style={{ 
                          fontSize: '36px', 
                          padding: '10px 14px', 
                          color: star <= newReviewRating ? '#fbbf24' : 'var(--border-subtle)', 
                          cursor: 'pointer', 
                          transition: 'transform 0.1s', 
                          textShadow: star <= newReviewRating ? '0 2px 10px rgba(251, 191, 36, 0.4)' : 'none',
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none'
                        }}
                      >★</span>
                    ))}
                  </div>
                  <textarea 
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder={lang === 'kh' ? 'សរសេរមតិយោបល់របស់អ្នក...' : 'Write your review...'}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', outline: 'none', resize: 'none', height: '80px', fontFamily: 'inherit', marginBottom: '12px', fontSize: '14px' }}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setShowReviewForm(false)}
                      style={{ background: 'transparent', color: 'var(--text-muted)', padding: '10px 16px', borderRadius: '100px', fontWeight: '800', border: '1px solid var(--border-subtle)', flex: 1 }}
                    >
                      {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
                    </button>
                    <button 
                      onClick={() => {
                        handleSubmitReview();
                        if (newReviewText.trim()) setShowReviewForm(false);
                      }}
                      disabled={submittingReview || !newReviewText.trim()}
                      style={{ background: 'var(--primary-gradient)', color: 'white', padding: '10px 16px', borderRadius: '100px', fontWeight: '800', border: 'none', opacity: (submittingReview || !newReviewText.trim()) ? 0.5 : 1, flex: 2, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                    >
                      {submittingReview ? '...' : (lang === 'kh' ? 'បញ្ជូនមតិយោបល់' : 'Submit Review')}
                    </button>
                  </div>
                </div>
              )}

              {/* Review List */}
              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
              ) : reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviews.map(rev => (
                    <div key={rev.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '800', color: 'var(--text-bold)' }}>{rev.user_name}</span>
                        <span style={{ color: '#fbbf24', fontSize: '14px', letterSpacing: '2px' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5-rev.rating)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6' }}>{rev.comment}</p>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block', fontWeight: '600' }}>
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px', background: 'var(--bg-soft)', borderRadius: '12px' }}>
                  {lang === 'kh' ? 'មិនទាន់មានការវាយតម្លៃនៅឡើយទេ សូមក្លាយជាអ្នកវាយតម្លៃដំបូងគេ!' : 'No reviews yet. Be the first to review!'}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Sticky Footer */}
        <div className="pd-footer">
          <button
            className={`pd-heart-btn ${isFavorited ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (typeof onToggleWishlist === 'function') onToggleWishlist(); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          <button
            className={`pd-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
            onClick={handleAdd}
            disabled={isOutOfStock}
            style={{ flex: 1, padding: '0 8px' }}
          >
            {isOutOfStock
              ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock')
              : (t ? t('add_to_cart') : (lang === 'kh' ? 'ដាក់ចូលកន្ត្រក' : 'Add to Cart'))
            }
          </button>
          
          <button
            className={`pd-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            style={{ flex: 1, padding: '0 8px', background: 'var(--primary-accent)', color: 'white' }}
          >
            {isOutOfStock
              ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock')
              : (lang === 'kh' ? 'ទិញឥឡូវនេះ' : 'Buy Now')
            }
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
