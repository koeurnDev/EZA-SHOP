import React from 'react';
import ProductCard from './ProductCard';

/**
 * 💖 Premium Boutique Wishlist Page (សំណព្វ)
 * A dedicated view for user's favorite items to eliminate redundancy.
 */
const WishlistPage = ({ 
  wishlist = [], 
  products = [], 
  onAdd, 
  onViewProduct, 
  onToggleWishlist,
  activeDiscounts = [], 
  handleBulkAddToCart,
  setView, 
  t, 
  lang 
}) => {
  const favoriteProducts = products.filter(p => wishlist.some(id => String(id) === String(p.id)));

  return (
    <div className="history-page-luxury wishlist-page animate-in">
      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <button type="button" onClick={() => setView('profile')} className="back-btn-pill back-btn-pill--icon" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h1 className="wishlist-title">
            {lang === 'kh' ? 'សំណព្វ' : 'Favorites'}
          </h1>
        </div>
        <div className="wishlist-count">
          {favoriteProducts.length} {t('items')}
        </div>
      </div>

      {favoriteProducts.length > 0 && (
        <div className="wishlist-bulk-banner">
          <div>
            <div className="wishlist-bulk-sub">
              {lang === 'kh' ? 'ទិញឈុតសំណព្វរបស់អ្នក' : 'Ready to buy favorites?'}
            </div>
            <div className="wishlist-bulk-title">
              {lang === 'kh' ? 'បញ្ជូលទៅក្នុងកន្ត្រកទាំងអស់' : 'Add entire collection'}
            </div>
          </div>
          <button
            type="button"
            className="wishlist-bulk-btn"
            onClick={() => handleBulkAddToCart?.(wishlist)}
            aria-label={lang === 'kh' ? 'បញ្ជូលកន្ត្រកទាំងអស់' : 'Add all to cart'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
              <path d="M3 6h18"></path>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </button>
        </div>
      )}

      {favoriteProducts.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h2 className="wishlist-empty-title">
            {lang === 'kh' ? 'មិនទាន់មានសំណព្វនៅឡើយទេ' : 'Your wishlist is empty'}
          </h2>
          <p className="wishlist-empty-desc">
            {lang === 'kh' ? 'រក្សាទុកទំនិញដែលអ្នកស្រលាញ់ ដើម្បីងាយស្រួលទិញនៅពេលក្រោយ' : 'Save items you love to find them easily later.'}
          </p>
          <button type="button" onClick={() => setView('browse')} className="wishlist-empty-btn">
            {lang === 'kh' ? 'ទៅមើលទំនិញ' : 'Browse Products'}
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {favoriteProducts.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={onAdd}
              onViewProduct={onViewProduct}
              activeDiscounts={activeDiscounts}
              t={t}
              isFavorited={true}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
