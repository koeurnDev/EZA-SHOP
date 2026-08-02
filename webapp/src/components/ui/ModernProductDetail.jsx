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
          <div style={{
            width: '220px', 
            height: '240px', 
            background: 'rgba(255,255,255,0.3)', 
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#1e6091', 
            fontWeight: '900',
            letterSpacing: '2px',
            fontSize: '18px'
          }}>
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
            <div className="similar-item-img-placeholder" style={{backgroundColor: '#fff1f2'}}>
               {/* Tiny placeholder bottle */}
               <div style={{width: '24px', height: '36px', background: '#fda4af', borderRadius: '4px'}}></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder" style={{backgroundColor: '#f8fafc'}}>
               <div style={{width: '28px', height: '32px', background: '#94a3b8', borderRadius: '4px'}}></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder" style={{backgroundColor: '#fef3c7'}}>
               <div style={{width: '26px', height: '40px', background: '#fcd34d', borderRadius: '4px'}}></div>
            </div>
          </div>
          <div className="similar-item">
            <div className="similar-item-img-placeholder" style={{backgroundColor: '#fae8ff'}}>
               <div style={{width: '22px', height: '46px', background: '#d8b4fe', borderRadius: '4px'}}></div>
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
