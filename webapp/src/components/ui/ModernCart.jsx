import React from 'react';
import './ModernCart.css';

const ModernCart = () => {
  return (
    <div className="modern-cart-container">
      {/* Header */}
      <header className="cart-header">
        <button className="cart-header-btn" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="cart-header-title">My cart</h1>
        <button className="cart-header-btn" aria-label="More options">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="19" cy="12" r="1.5"></circle>
            <circle cx="5" cy="12" r="1.5"></circle>
          </svg>
        </button>
      </header>

      {/* Cart Items */}
      <div className="cart-items-list">
        {/* Item 1 */}
        <div className="cart-item">
          <div className="cart-item-image">
            {/* Placeholder for Xbox image */}
            <div style={{width: '70px', height: '70px', backgroundColor: '#111827', borderRadius: '8px', position: 'relative'}}>
               <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(135deg, #22c55e 25%, transparent 25%) -10px 0, linear-gradient(225deg, #22c55e 25%, transparent 25%) -10px 0, linear-gradient(315deg, #22c55e 25%, transparent 25%), linear-gradient(45deg, #22c55e 25%, transparent 25%)', backgroundSize: '20px 20px', opacity: 0.5}}></div>
            </div>
          </div>
          <div className="cart-item-details">
            <button className="cart-item-remove" aria-label="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 className="cart-item-title">Xbox series X</h3>
            <p className="cart-item-variant">1 TB</p>
            <div className="cart-item-bottom">
              <span className="cart-item-price">$570.00</span>
              <div className="cart-item-controls">
                <button className="cart-qty-btn minus" aria-label="Decrease quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span className="cart-qty-value">1</span>
                <button className="cart-qty-btn plus" aria-label="Increase quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Item 2 */}
        <div className="cart-item">
          <div className="cart-item-image">
             {/* Placeholder for Blue Controller */}
             <div style={{width: '60px', height: '40px', backgroundColor: '#2563eb', borderRadius: '10px', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px'}}></div>
          </div>
          <div className="cart-item-details">
            <button className="cart-item-remove" aria-label="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 className="cart-item-title">Wireless Controller</h3>
            <p className="cart-item-variant">Blue</p>
            <div className="cart-item-bottom">
              <span className="cart-item-price">$77.00</span>
              <div className="cart-item-controls">
                <button className="cart-qty-btn minus" aria-label="Decrease quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span className="cart-qty-value">1</span>
                <button className="cart-qty-btn plus" aria-label="Increase quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Item 3 */}
        <div className="cart-item">
          <div className="cart-item-image">
             {/* Placeholder for Green Headset */}
             <div style={{width: '60px', height: '60px', borderRadius: '50%', border: '12px solid #84cc16', borderBottomColor: 'transparent'}}></div>
          </div>
          <div className="cart-item-details">
            <button className="cart-item-remove" aria-label="Remove item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 className="cart-item-title">Razer Kaira Pro</h3>
            <p className="cart-item-variant">Green</p>
            <div className="cart-item-bottom">
              <span className="cart-item-price">$153.00</span>
              <div className="cart-item-controls">
                <button className="cart-qty-btn minus" aria-label="Decrease quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span className="cart-qty-value">1</span>
                <button className="cart-qty-btn plus" aria-label="Increase quantity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promo */}
      <div className="cart-promo">
        <span className="cart-promo-code">ADJ3AK</span>
        <div className="cart-promo-status">
          Promocode applied
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#22c55e" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12.5l3 3 5-6" strokeWidth="2" strokeLinecap="round"></path>
          </svg>
        </div>
      </div>

      {/* Summary */}
      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Subtotal:</span>
          <span className="cart-summary-value">$800.00</span>
        </div>
        <div className="cart-summary-row">
          <span>Delivery Fee:</span>
          <span className="cart-summary-value">$5.00</span>
        </div>
        <div className="cart-summary-row">
          <span>Discount:</span>
          <span className="cart-summary-value">40%</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="cart-checkout-wrapper">
        <button className="cart-checkout-btn">
          Checkout for $480.00
        </button>
      </div>
    </div>
  );
};

export default ModernCart;
