import React, { useState } from 'react';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';
import { formatCategory } from '../utils/langUtils';
import { getVariantUnitMode, getCapacityLabel, getSelectionPrompt } from '../utils/variantUnitUtils';

import ImageLightboxModal from './ui/ImageLightboxModal';
import { shareProduct } from '../utils/shareUtils';
import useScrollHideBar from '../hooks/useScrollHideBar';

/**
 * ProductDetail — immersive gallery, Telegram BackButton for close
 */
const ProductDetail = ({ product, allProducts = [], onAdd, onClose, onBuyNow, activeDiscounts = [], t, lang, shopLogoUrl, isFavorited = false, onToggleWishlist, onSelectRelated }) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  // Image Zoom State
  const [zoomIndex, setZoomIndex] = useState(null);

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
  const footerVisible = useScrollHideBar({ enabled: true, scrollRef: mainScrollRef, resetKey: product?.id });
  const [zoomState, setZoomState] = useState({ show: false, x: 0, y: 0, index: -1 });

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
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

      setLoadingReviews(true);
      fetch(`${BACKEND_URL}/api/products/${product.id}/reviews`)
        .then(res => res.json())
        .then(data => {
          if (!data.success) return;
          setReviews(data.reviews || []);
          if (data.stats) {
            setFullProduct(prev => ({
              ...prev,
              avg_rating: data.stats.avg_rating ?? prev?.avg_rating ?? 0,
              review_count: data.stats.review_count ?? prev?.review_count ?? 0
            }));
          }
        })
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
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const initData = window.Telegram?.WebApp?.initData || '';

      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TG-Data': initData },
        body: JSON.stringify({
          product_id: product.id,
          rating: newReviewRating,
          comment: newReviewText
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviews(prev => [data.review, ...prev]);
        setFullProduct(prev => prev ? {
          ...prev,
          review_count: data.stats?.review_count ?? prev.review_count,
          avg_rating: data.stats?.avg_rating ?? prev.avg_rating
        } : prev);
        setNewReviewText('');
        setNewReviewRating(5);
        setShowReviewForm(false);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        alert(data.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!product) return null;

  const gallery = React.useMemo(() => {
    const imgs = [
      fullProduct.image,
      ...(typeof fullProduct.additional_images === 'string'
        ? JSON.parse(fullProduct.additional_images || '[]')
        : (fullProduct.additional_images || []))
    ].filter(img => img && typeof img === 'string');
    return imgs.length > 0 ? imgs : ['/favicon.png'];
  }, [fullProduct.image, fullProduct.additional_images]);

  const bestDiscount = calculateBestDiscount(product, activeDiscounts);
  const discountedPriceValue = getDiscountedPrice(product, bestDiscount);
  const isDiscounted = bestDiscount !== null;
  const displayProduct = fullProduct || product;
  const hasReviews = displayProduct.review_count && displayProduct.review_count > 0;
  const relatedProducts = allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 8);

  const variants = React.useMemo(() => {
    try {
      return (typeof displayProduct.variants === 'string' ? JSON.parse(displayProduct.variants) : displayProduct.variants) || [];
    } catch (e) { return []; }
  }, [displayProduct.variants]);

  const hasVariants = variants.length > 0;
  const uniqueColors = React.useMemo(() => [...new Set(variants.map(v => v.color).filter(Boolean))], [variants]);
  const uniqueSizes = React.useMemo(() => [...new Set(variants.map(v => v.size).filter(Boolean))], [variants]);

  const unitMode = React.useMemo(
    () => getVariantUnitMode({
      category: displayProduct.category || '',
      productName: displayProduct.name || '',
      variantSizes: uniqueSizes
    }),
    [displayProduct.category, displayProduct.name, uniqueSizes]
  );
  const capacityLabel = getCapacityLabel(lang, unitMode);

  const selectedVariant = React.useMemo(() => {
    if (!hasVariants) return null;
    return variants.find(v =>
      (v.color === selectedColor || (!uniqueColors.length)) &&
      (v.size === selectedSize || (!uniqueSizes.length))
    );
  }, [variants, selectedColor, selectedSize, hasVariants, uniqueColors, uniqueSizes]);

  const actualStock = hasVariants
    ? (selectedVariant ? selectedVariant.stock : variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0))
    : displayProduct.stock;

  const isOutOfStock = actualStock <= 0;
  const isSelectionIncomplete = hasVariants && ((uniqueColors.length > 0 && !selectedColor) || (uniqueSizes.length > 0 && !selectedSize));

  const handleBuyNow = (e) => {
    e.stopPropagation();
    if (isSelectionIncomplete) {
      alert(getSelectionPrompt(lang, {
        unitMode,
        needsCapacity: uniqueSizes.length > 0 && !selectedSize,
        needsColor: uniqueColors.length > 0 && !selectedColor
      }));
      return;
    }
    if (actualStock > 0 && quantity > actualStock) {
      alert(lang === 'kh' ? `សុំទោស! ទំនិញនេះមានក្នុងស្តុកតែ ${actualStock} ប៉ុណ្ណោះ` : `Sorry, only ${actualStock} in stock`);
      return;
    }

    if (!isOutOfStock) {
      for (let i = 0; i < quantity; i++) { onAdd(product, e, selectedVariant); }
    }

    if (typeof onBuyNow === 'function') onBuyNow(e);
  };

  const handleAdd = (e) => {
    if (isOutOfStock) return;
    if (isSelectionIncomplete) {
      alert(getSelectionPrompt(lang, {
        unitMode,
        needsCapacity: uniqueSizes.length > 0 && !selectedSize,
        needsColor: uniqueColors.length > 0 && !selectedColor
      }));
      return;
    }
    for (let i = 0; i < quantity; i++) { onAdd(product, e, selectedVariant); }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  return (
    <>
      {zoomIndex !== null && (
        <ImageLightboxModal
          images={gallery}
          initialIndex={zoomIndex}
          onClose={() => setZoomIndex(null)}
        />
      )}
      <div className="pd-overlay">
        <div className="pd-sheet">

          {/* Scrollable content — Telegram BackButton handles close (no duplicate back) */}
          <div className="pd-scroll" ref={mainScrollRef}>

            {/* Immersive Image Gallery */}
            <div className="pd-image-section-wrapper">
              <div className="pd-image-area">

                {!(typeof window !== 'undefined' && window.Telegram?.WebApp?.BackButton && window.Telegram.WebApp.isVersionAtLeast?.('6.1')) && (
                  <div className="pd-float-actions pd-float-actions-left">
                    <button className="pd-float-btn" onClick={onClose} aria-label="Back">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="pd-float-actions">
                  <button className="pd-float-btn" onClick={(e) => {
                    e.stopPropagation();
                    shareProduct(product, discountedPriceValue, lang);
                  }} aria-label="Share">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  </button>
                  <button className="pd-float-btn" onClick={(e) => { e.stopPropagation(); if (typeof onBuyNow === 'function') onBuyNow(e); }} aria-label="Cart">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </button>
                </div>

                <div
                  className="pd-swiper"
                  ref={scrollRef}
                  onScroll={() => {
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => {
                      if (!scrollRef.current) return;
                      const target = scrollRef.current;
                      const w = target.clientWidth;
                      if (w > 0) {
                        const idx = Math.round(target.scrollLeft / w);
                        if (idx >= 0 && idx < gallery.length) {
                          setActiveImg(idx);
                        }
                      }
                    }, 40);
                  }}
                >
                  {gallery.map((img, i) => (
                    <div
                      key={i}
                      className="pd-slide"
                      onClick={() => setZoomIndex(i)}
                      onMouseMove={(e) => {
                        if (window.innerWidth < 768) return;
                        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                        const xPercent = ((e.clientX - left) / width) * 100;
                        const yPercent = ((e.clientY - top) / height) * 100;
                        setZoomState({ show: true, x: xPercent, y: yPercent, index: i });
                      }}
                      onMouseLeave={() => setZoomState({ show: false, x: 0, y: 0, index: -1 })}
                      style={{ position: 'relative', cursor: 'zoom-in' }}
                    >
                      <img
                        src={(img && img.includes('cloudinary'))
                          ? img.replace('upload/', 'upload/f_auto,q_auto,w_1000,h_1250,c_fill,g_auto/')
                          : img}
                        alt={`${product.name} ${i + 1}`}
                        className="pd-slide-img"
                        loading="eager"
                        decoding={i === 0 ? "sync" : "async"}
                        fetchpriority={i === 0 ? "high" : "auto"}
                        onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                        style={{ opacity: (zoomState.show && zoomState.index === i && window.innerWidth >= 768) ? 0 : 1 }}
                      />

                      {zoomState.show && zoomState.index === i && window.innerWidth >= 768 && (
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundImage: `url(${(img && img.includes('cloudinary')) ? img.replace('upload/', 'upload/f_auto,q_auto:best,w_2000/') : img})`,
                          backgroundPosition: `${zoomState.x}% ${zoomState.y}%`,
                          backgroundSize: '200%',
                          backgroundRepeat: 'no-repeat',
                          zIndex: 5,
                          pointerEvents: 'none'
                        }} />
                      )}

                      <div className="pd-zoom-hint">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          <line x1="11" y1="8" x2="11" y2="14"></line>
                          <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {gallery.length > 1 && (
                <div className="pd-thumbnails-row">
                  {gallery.map((img, i) => (
                    <button
                      type="button"
                      key={i}
                      className={`pd-thumb-item ${i === activeImg ? 'active' : ''}`}
                      onClick={() => {
                        if (scrollRef.current) {
                          const w = scrollRef.current.clientWidth;
                          scrollRef.current.scrollTo({ left: i * w, behavior: 'smooth' });
                        }
                        setActiveImg(i);
                      }}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img
                        src={img.includes('cloudinary') ? img.replace('upload/', 'upload/f_auto,q_auto,w_200,c_fill,g_auto/') : img}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="pd-content">

              {/* Product Name */}
              <h1 className="pd-name">{product.name}</h1>

              {/* Star Rating */}
              {hasReviews && (
                <div className="pd-rating-row">
                  <span className="pd-star">★</span>
                  <span className="pd-rating-val">{parseFloat(displayProduct.avg_rating).toFixed(1)}</span>
                  <span className="pd-rating-count">({displayProduct.review_count.toLocaleString()} Reviews)</span>
                </div>
              )}

              {/* Price and Quantity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
                <div className="pd-price-row" style={{ margin: 0 }}>
                  <span className="pd-price-now" style={isDiscounted ? { color: '#ef4444' } : {}}>${discountedPriceValue} USD</span>
                  {isDiscounted && (
                    <>
                      <span className="pd-price-was" style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>${product.price} USD</span>
                      <span className="pd-pct-badge" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginLeft: '6px', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)' }}>
                        -{bestDiscount.value}{bestDiscount.discount_type === 'percent' ? '%' : '$'}
                      </span>
                    </>
                  )}
                </div>

                <div className="pd-qty-selector">
                  <button onClick={() => setQuantity(prev => (prev > 1 ? prev - 1 : 1))} className="pd-qty-btn" aria-label="Decrease quantity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                  </button>
                  <span className="pd-qty-val">{quantity}</span>
                  <button onClick={() => setQuantity(prev => prev + 1)} className="pd-qty-btn" aria-label="Increase quantity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                </div>
              </div>

              {/* Variants Selection */}
              {hasVariants && (
                <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  {uniqueColors.length > 0 && (
                    <div style={{ marginBottom: uniqueSizes.length > 0 ? '14px' : '0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-bold)' }}>{lang === 'kh' ? 'ពណ៌' : 'Color'}: <span style={{ color: 'var(--text-muted)' }}>{selectedColor || ''}</span></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {uniqueColors.map(c => {
                          const isSelected = selectedColor === c;
                          const colorMatches = variants.filter(v => v.color === c && (!selectedSize || v.size === selectedSize));
                          const colorStock = colorMatches.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
                          const isColorDisabled = colorStock <= 0;

                          return (
                            <button
                              key={c}
                              disabled={isColorDisabled}
                              onClick={() => !isColorDisabled && setSelectedColor(isSelected ? null : c)}
                              className={`pd-variant-btn ${isSelected ? 'selected' : ''} ${isColorDisabled ? 'disabled' : ''}`}
                            >
                              {c} {isColorDisabled ? (lang === 'kh' ? '(អស់)' : '(Out)') : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {uniqueSizes.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-bold)' }}>{capacityLabel}: <span style={{ color: 'var(--text-muted)' }}>{selectedSize || ''}</span></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {uniqueSizes.map(s => {
                          const isSelected = selectedSize === s;
                          const sizeMatches = variants.filter(v => v.size === s && (!selectedColor || v.color === selectedColor));
                          const sizeStock = sizeMatches.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
                          const isSizeDisabled = sizeStock <= 0;

                          return (
                            <button
                              key={s}
                              disabled={isSizeDisabled}
                              onClick={() => !isSizeDisabled && setSelectedSize(isSelected ? null : s)}
                              className={`pd-variant-btn ${isSelected ? 'selected' : ''} ${isSizeDisabled ? 'disabled' : ''}`}
                            >
                              {s} {isSizeDisabled ? (lang === 'kh' ? '(អស់)' : '(Out)') : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info rows */}
              <div className="pd-info-rows">
                <div className={`pd-info-row ${isOutOfStock ? 'out-of-stock' : ''}`}>
                  <span className={`pd-stock-dot ${isOutOfStock ? 'out' : 'in'}`} />
                  <span className="pd-info-text">
                    {isOutOfStock
                      ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of stock')
                      : (lang === 'kh' ? `មានស្តុក (${actualStock})` : `In stock (${actualStock})`)}
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
                <div className="pd-related-section" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '900', marginBottom: '16px', color: 'var(--text-bold)' }}>
                    {lang === 'kh' ? 'ផលិតផលស្រដៀងគ្នា' : 'You might also like'}
                  </h3>
                  <div className="pd-related-row">
                    {relatedProducts.map(rp => (
                      <div
                        key={rp.id}
                        onClick={() => {
                          if (onSelectRelated) onSelectRelated(rp);
                        }}
                        style={{ minWidth: '120px', width: '120px', cursor: 'pointer', background: 'var(--bg-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}
                      >
                        <div className="pd-image-area" style={{ height: '140px', borderRadius: 0 }}>
                          <img
                            src={(rp.image && rp.image.includes('cloudinary')) ? rp.image.replace('upload/', 'upload/f_auto,q_auto,w_200,c_fill,g_auto/') : rp.image}
                            alt={rp.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                          />
                        </div>
                        <div style={{ padding: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-bold)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{rp.name}</div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-bold)' }}>${rp.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <style>{`.pd-related-section ::-webkit-scrollbar { display: none; }`}</style>
                </div>
              )}

              {/* Reviews Section */}
              <div className="pd-reviews-section" style={{ marginTop: '32px', paddingTop: '24px', paddingBottom: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'var(--text-bold)' }}>
                    {lang === 'kh' ? 'ការវាយតម្លៃអតិថិជន' : 'Customer Reviews'}
                  </h3>
                  {!showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      style={{ background: 'transparent', color: 'var(--text-muted)', padding: '5px 14px', borderRadius: '100px', fontWeight: '700', border: '1.5px solid var(--border-subtle)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {lang === 'kh' ? 'សរសេរការវាយតម្លៃ' : 'Write Review'}
                    </button>
                  )}
                </div>

                {/* Add Review Form */}
                {showReviewForm && (
                  <div style={{ background: 'var(--bg-soft)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
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
                      style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', outline: 'none', resize: 'none', height: '80px', fontFamily: 'inherit', marginBottom: '12px', fontSize: '14px', color: 'var(--text-main)' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        style={{ background: 'transparent', color: 'var(--text-muted)', padding: '10px 16px', borderRadius: '100px', fontWeight: '800', border: '1px solid var(--border-subtle)', flex: 1, cursor: 'pointer' }}
                      >
                        {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleSubmitReview()}
                        disabled={submittingReview || !newReviewText.trim()}
                        style={{ background: 'var(--primary-gradient, linear-gradient(135deg, #111827, #1f2937))', color: 'white', padding: '10px 16px', borderRadius: '100px', fontWeight: '800', border: 'none', opacity: (submittingReview || !newReviewText.trim()) ? 0.5 : 1, flex: 2, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer' }}
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
                          <span style={{ color: '#fbbf24', fontSize: '14px', letterSpacing: '2px' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
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

          {/* Sticky Footer — auto-hide on scroll down */}
          <div className={`pd-footer${footerVisible ? '' : ' pd-footer--hidden'}`}>
            <button
              className={`pd-heart-btn ${isFavorited ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); if (typeof onToggleWishlist === 'function') onToggleWishlist(); }}
              aria-label="Wishlist"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            <button
              className={`pd-cart-btn outline ${isOutOfStock ? 'disabled' : ''}`}
              onClick={handleAdd}
              disabled={isOutOfStock}
            >
              {isOutOfStock
                ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock')
                : (t ? t('add_to_cart') : (lang === 'kh' ? 'បន្ថែមទៅកន្ត្រក' : 'Add to Cart'))
              }
            </button>

            <button
              className={`pd-cart-btn ${isOutOfStock ? 'disabled' : ''}`}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              {isOutOfStock
                ? (lang === 'kh' ? 'អស់ស្តុក' : 'Out of Stock')
                : (lang === 'kh' ? 'ទិញឥឡូវនេះ' : 'Buy Now')
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ProductDetail;
