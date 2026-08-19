import React from 'react';
import './ModernProductDetail.css';

const ModernProductDetail = () => {
  return (
    <div className="product-detail-container">
      {/* Top Image Section */}
      <div className="product-image-section">
        <header className="product-header">
          <button className="icon-btn" aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn" aria-label="Shopping bag">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"></path>
              <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round"></line>
              <path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </button>
        </header>
        
        <div className="product-image-wrapper">
          {/* Placeholder for the Nautica Perfume Image */}
          <div className="w-[220px] h-[240px] bg-white/30 border-2 border-white/60 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-3xl flex items-center justify-center text-[#1e6091] font-black tracking-[2px] text-lg">
            NAUTICA
          </div>
        </div>
      </div>

      {/* Bottom Info Sheet (The Overlapping Card) */}
      <div className="product-info-sheet">
        {/* The small pill handle at the top of the sheet */}
        <div className="drag-handle"></div>
        
        <div className="product-brand">NAUTICA</div>
        
        <div className="product-title-row">
          <h1 className="product-title">Nautica Voyage Eau De Toilette</h1>
          <span className="product-price">$89.20</span>
        </div>
        
        <p className="product-description">
          Nautica Voyage is a fresh and salty sea breeze, that carries romantic scents of coastal herbs and woods and awakes the man's instinct to measure his power with wild nature.
        </p>
        
        <h3 className="section-title">Similar this</h3>
        
        {/* Horizontally scrollable list of oval similar items */}
        <div className="similar-products-scroll">
          <div className="similar-item">
            <div className="similar-item-img-placeholder bg-[#fff1f2]">
               {/* Tiny placeholder bottle */}
               <div className="w-6 h-9 bg-[#fda4af] rounded"></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder bg-[#f8fafc]">
               <div className="w-7 h-8 bg-[#94a3b8] rounded"></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder bg-[#fef3c7]">
               <div className="w-[26px] h-10 bg-[#fcd34d] rounded"></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder bg-[#fae8ff]">
               <div className="w-[22px] h-[46px] bg-[#d8b4fe] rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="product-action-bar">
        <button className="favorite-btn" aria-label="Add to favorites">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>
        <button className="add-to-cart-btn">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ModernProductDetail;
