import React, { useState, useMemo } from 'react';
import { useCartState, useCartDispatch } from '../context/CartContext';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { useTelegram } from '../context/TelegramContext';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';
import DeliveryForm from './DeliveryForm';
import './ui/ModernCart.css';

const CartPage = ({
  formData, setFormData, onPhoneChange, isPhoneValid, isAddressValid,
  validationErrors = {}, onCheckout, isPlacingOrder = false
}) => {
  const { cart, totalPrice, totalItemsCount } = useCartState();
  const { updateQty, clearCart } = useCartDispatch();
  const { activeDiscounts, deliveryThreshold, deliveryFee } = useShopState();
  const { setView } = useShopDispatch();
  const { t, lang, user } = useUserState();
  const { tg } = useTelegram();

  const [step, setStep] = useState(1); // 1: Review, 2: Info/Payment
  const threshold = parseFloat(deliveryThreshold) || 50;
  const fee = parseFloat(deliveryFee) || 0;

  const totalDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const relevant = activeDiscounts.filter(d => d.apply_to === 'all' || (d.product_ids && d.product_ids.includes(item.id)));
      if (relevant.length === 0) return sum;

      const best = relevant.sort((a, b) => {
        const valA = a.discount_type === 'percent' ? (item.price * a.value / 100) : a.value;
        const valB = b.discount_type === 'percent' ? (item.price * b.value / 100) : b.value;
        return valB - valA;
      })[0];

      const itemDiscount = best.discount_type === 'percent'
        ? (item.price * (best.value / 100))
        : Math.min(item.price, best.value);

      return sum + (itemDiscount * item.quantity);
    }, 0);
  }, [cart, activeDiscounts]);

  const subTotal = Math.max(0, totalPrice - totalDiscount);
  const isFreeDelivery = subTotal >= threshold;
  const appliedFee = isFreeDelivery ? 0 : fee;
  const finalTotal = subTotal + appliedFee;

  const handleBack = () => {
    if (step === 2) setStep(1);
    else setView('home');
  };

  const handlePrimaryAction = () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo(0, 0);
    } else {
      if (!isPlacingOrder && isPhoneValid && isAddressValid) {
        onCheckout(finalTotal);
      } else if (!isPhoneValid || !isAddressValid) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      }
    }
  };

  // 🛡️ Advanced Telegram Native UX: MainButton
  React.useEffect(() => {
    if (!tg?.MainButton) return;
    const mb = tg.MainButton;
    
    if (totalItemsCount > 0) {
      if (step === 1) {
        mb.text = lang === 'kh' ? `បន្តការបញ្ជាទិញ • $${finalTotal.toFixed(2)}` : `CONTINUE • $${finalTotal.toFixed(2)}`;
      } else {
        mb.text = isPlacingOrder 
          ? (lang === 'kh' ? 'កំពុងដំណើរការ...' : 'PROCESSING...') 
          : (lang === 'kh' ? `បញ្ជាក់ការកម្ម៉ង់ • $${finalTotal.toFixed(2)}` : `PLACE ORDER • $${finalTotal.toFixed(2)}`);
      }
      
      mb.color = '#059669'; // Emerald-600
      mb.textColor = '#ffffff';
      
      if (isPlacingOrder || (step === 2 && (!isPhoneValid || !isAddressValid))) {
         mb.disable();
         mb.color = '#94a3b8'; // disabled gray
      } else {
         mb.enable();
         mb.color = '#059669';
      }
      
      mb.show();
      mb.onClick(handlePrimaryAction);
    } else {
      mb.hide();
    }
    
    return () => {
      mb.offClick(handlePrimaryAction);
      mb.hide();
    };
  }, [tg, step, finalTotal, isPlacingOrder, isPhoneValid, isAddressValid, totalItemsCount, lang]);

  if (totalItemsCount === 0) {
    return (
      <main className="checkout-section animate-in p-5">
        <div className="flex items-center gap-4 mb-8">
          <button className="w-10 h-10 flex items-center justify-center glass-effect rounded-full" onClick={() => setView('home')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-black text-bold">{t('cart_title')}</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative mb-8 flex justify-center items-center">
             <div className="absolute bg-primary-accent opacity-20 blur-3xl rounded-full" style={{ width: '120px', height: '120px' }}></div>
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--primary-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
             </svg>
          </div>
          <h3 className="text-xl font-black text-bold mb-2 text-center">{lang === 'kh' ? 'កន្ត្រករបស់អ្នកទទេស្អាត' : 'Your cart is empty'}</h3>
          <p className="text-sm font-bold text-muted mb-8 text-center max-w-[260px] leading-relaxed">
            {lang === 'kh' ? 'សូមចូលទៅកាន់ទំព័រដើម ដើម្បីជ្រើសរើសទំនិញដែលលោកអ្នកពេញចិត្ត!' : 'Looks like you haven\'t added any items to your cart yet.'}
          </p>
          <button className="px-10 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 hover:scale-105" onClick={() => setView('home')} style={{ letterSpacing: '0.5px' }}>
            {lang === 'kh' ? 'ទៅទិញឥឡូវនេះ' : 'Shop Now'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-section animate-in p-5">
      <div className="flex items-center gap-4 mb-8">
        <button className="w-10 h-10 flex items-center justify-center glass-effect rounded-full" onClick={handleBack} aria-label={t('back')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-xl font-black text-bold">{step === 1 ? t('cart_title') : t('checkout')}</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {step === 1 ? (
            <div className="animate-in mb-8">
              <h3 className="text-lg font-black text-bold mb-4">{t('items')} ({totalItemsCount})</h3>
              <div className="cart-items-list">
                {cart.map(item => {
                  const best = calculateBestDiscount(item, activeDiscounts);
                  const dPrice = best ? getDiscountedPrice(item, best) : null;
                  const finalPrice = dPrice || item.price;
                  const isDiscounted = dPrice !== null && dPrice < item.price;
                  
                  return (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-image">
                      <img
                        src={item.image.includes('cloudinary') ? item.image.replace('upload/', 'upload/f_auto,q_auto,w_100/') : item.image}
                        alt="" className="w-full h-full object-cover rounded-[14px]"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="cart-item-details">
                      <button className="cart-item-remove" aria-label="Remove item" onClick={() => updateQty(item.id, -item.quantity)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                      <h3 className="cart-item-title line-clamp-1">{item.name}</h3>
                      <p className="cart-item-variant">{item.category}</p>
                      <div className="cart-item-bottom">
                        <span className={`cart-item-price ${isDiscounted ? 'text-red-500' : ''}`}>
                          ${(finalPrice * item.quantity).toFixed(2)}
                          {isDiscounted && <span style={{display: 'block', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'line-through'}}>${(item.price * item.quantity).toFixed(2)}</span>}
                        </span>
                        <div className="cart-item-controls">
                          <button className="cart-qty-btn minus" aria-label="Decrease quantity" onClick={() => updateQty(item.id, -1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button className="cart-qty-btn plus" aria-label="Increase quantity" onClick={() => updateQty(item.id, 1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ) : (
            <div className="animate-in">
              <DeliveryForm
                user={user} formData={formData}
                onPhoneChange={onPhoneChange} setFormData={setFormData}
                t={t} lang={lang} validationErrors={validationErrors}
              />
              {/* Payment info hidden as requested */}
              <button className="mt-6 flex items-center gap-2 text-xs font-black uppercase text-muted tracking-widest" onClick={() => setStep(1)}>
                ← {t('edit_cart')}
              </button>
            </div>
          )}
        </div>

        <div className="lg:w-80">
          <div className="sticky top-5 p-6 bg-bg-surface rounded-3xl border border-border-subtle shadow-lg">
            <h3 className="text-lg font-black text-bold mb-6">{t('summary')}</h3>
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-dashed border-border-subtle">
              {cart.map(item => {
                const best = calculateBestDiscount(item, activeDiscounts);
                const dPrice = best ? getDiscountedPrice(item, best) : null;
                return (
                  <div key={item.id} className="flex justify-between items-baseline text-sm">
                <div className="text-bold font-bold truncate max-w-[140px] tracking-tight">{item.name} x {item.quantity}</div>
                <div className="font-black text-bold tabular-nums">
                  {dPrice ? `$${(dPrice * item.quantity).toFixed(2)}` : `$${(item.price * item.quantity).toFixed(2)}`}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center text-sm">
            <div className="text-bold font-bold uppercase tracking-tight">{t('delivery_label')}</div>
            <div className="font-black text-bold tabular-nums">${appliedFee.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-8">
          <span className="text-lg font-black uppercase text-bold">{lang === 'kh' ? 'សរុប:' : 'Total:'}</span>
          <span className="text-2xl font-black text-emerald-600 tabular-nums">${finalTotal.toFixed(2)}</span>
        </div>
        <button
          className={`w-full py-4 flex items-center justify-center gap-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all ${isPlacingOrder ? 'opacity-75 cursor-wait' : 'hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'} ${(step === 2 && (!isPhoneValid || !isAddressValid)) ? 'opacity-50 grayscale' : ''}`}
          onClick={handlePrimaryAction}
          disabled={isPlacingOrder || totalItemsCount === 0}
        >
              {isPlacingOrder ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : step === 1 ? (
                <>
                  <span>{t('next')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </>
              ) : (
                <>
                  <span>{t('order_now')}</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CartPage;
