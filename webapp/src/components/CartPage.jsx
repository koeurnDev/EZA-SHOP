import React, { useState, useMemo } from 'react';
import { useCartState, useCartDispatch } from '../context/CartContext';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { useTelegram } from '../context/TelegramContext';
import { calculateBestDiscount, getDiscountedPrice } from '../utils/discountUtils';
import DeliveryForm from './DeliveryForm';
import { formatCategory } from '../utils/langUtils';
import { getVariantUnitMode, getCapacityIcon } from '../utils/variantUnitUtils';
import { calculateDeliveryFee, formatDeliveryFeeLabel, isAlwaysFreeDelivery, parseDeliverySetting } from '../utils/deliveryUtils';
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
  const [promoInput, setPromoInput] = useState('');
  const [validatedPromo, setValidatedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const threshold = parseDeliverySetting(deliveryThreshold, 50);

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
  
  let manualDiscount = 0;
  if (validatedPromo) {
    if (validatedPromo.discount_type === 'percent') {
      manualDiscount = subTotal * (validatedPromo.value / 100);
    } else {
      manualDiscount = validatedPromo.value;
    }
  }
  
  const subTotalAfterPromo = Math.max(0, subTotal - manualDiscount);
  const appliedFee = calculateDeliveryFee(subTotalAfterPromo, deliveryFee, deliveryThreshold);
  const isFreeDelivery = appliedFee <= 0;
  const finalTotal = subTotalAfterPromo + appliedFee;
  const amountToFreeDelivery = !isAlwaysFreeDelivery(deliveryFee) && !isFreeDelivery
    ? Math.max(0, threshold - subTotalAfterPromo)
    : 0;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/orders/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TG-Data': tgInitData },
        body: JSON.stringify({ code: promoInput })
      });
      const data = await res.json();
      if (data.success && data.coupon) {
        setValidatedPromo(data.coupon);
        setPromoError('');
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        setValidatedPromo(null);
        setPromoError(data.error || (lang === 'kh' ? 'កូដមិនត្រឹមត្រូវ' : 'Invalid code'));
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      }
    } catch (err) {
      setPromoError(lang === 'kh' ? 'មានបញ្ហា' : 'Error validation');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else setView('home');
  };

  const handlePrimaryAction = async () => {
    if (step === 1) {
      setStep(2);
      window.scrollTo(0, 0);
      return;
    }

    if (!isPlacingOrder && isPhoneValid && isAddressValid) {
      const success = await onCheckout(finalTotal, validatedPromo ? validatedPromo.code : null);
      if (success) {
        setValidatedPromo(null);
        setPromoInput('');
      }
    } else if (!isPhoneValid || !isAddressValid) {
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      
      // Show an explicit error message to the user!
      const msg = lang === 'kh' 
        ? 'សូមបញ្ញូល លេខទូរស័ព្ទ និងអាសយដ្ឋាន ឲ្យបានត្រឹមត្រូវ ដើម្បីបន្តការកម្ម៉ង់!' 
        : 'Please enter a valid phone number and delivery address!';
      
      if (tg?.showAlert) {
        tg.showAlert(msg);
      } else {
        alert(msg);
      }
    }
  };

  // 🛡️ Hide Telegram Native UX: MainButton
  React.useEffect(() => {
    if (!tg?.MainButton) return;
    tg.MainButton.hide();
  }, [tg]);

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
             <div className="absolute rounded-full opacity-20 blur-3xl" style={{ width: '120px', height: '120px', background: 'var(--text-bold)' }}></div>
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--text-bold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>
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
      {step === 2 && (
        <div className="flex items-center gap-4 mb-8">
          <button className="w-10 h-10 flex items-center justify-center glass-effect rounded-full" onClick={handleBack} aria-label={t('back')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <h2 className="text-xl font-black text-bold">{t('checkout')}</h2>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          {step === 1 ? (
            <div className="animate-in mb-8">
              <h3 className="text-2xl font-black text-bold mb-6 lowercase">
                {t('items') || 'items'}
                <span style={{ marginLeft: 10, fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-muted)', opacity: 0.85 }}>
                  ({totalItemsCount})
                </span>
              </h3>
              <div className="cart-items-list">
                {cart.map(item => {
                  const best = calculateBestDiscount(item, activeDiscounts);
                  const dPrice = best ? getDiscountedPrice(item, best) : null;
                  const finalPrice = dPrice || item.price;
                  const isDiscounted = dPrice !== null && dPrice < item.price;
                  
                  return (
                  <div key={item.cartKey || item.id} className="cart-item">
                    <div className="cart-item-image">
                      <img
                        src={item.image.includes('cloudinary') ? item.image.replace('upload/', 'upload/f_auto,q_auto,w_100/') : item.image}
                        alt="" className="w-full h-full object-cover rounded-[14px]"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }}
                      />
                    </div>
                    <div className="cart-item-details">
                      <button className="cart-item-remove" aria-label="Remove item" onClick={() => updateQty(item.cartKey || item.id, -item.quantity)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                      <h3 className="cart-item-title line-clamp-1">{item.name}</h3>
                      <p className="cart-item-variant">
                        {formatCategory(item.category, lang)}
                        {item.variant && (
                          <span style={{ display: 'inline-block', marginLeft: '6px', padding: '2px 6px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {item.variant.color && `🎨 ${item.variant.color} `}
                            {item.variant.size && `${getCapacityIcon(getVariantUnitMode({ category: item.category, productName: item.name, variantSizes: [item.variant.size] }))} ${item.variant.size}`}
                          </span>
                        )}
                      </p>
                      <div className="cart-item-bottom">
                        <span className={`cart-item-price ${isDiscounted ? 'text-red-500' : ''}`}>
                          ${(finalPrice * item.quantity).toFixed(2)}
                          {isDiscounted && <span style={{display: 'block', fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'line-through'}}>${(item.price * item.quantity).toFixed(2)}</span>}
                        </span>
                        <div className="cart-item-controls">
                          <button className="cart-qty-btn minus" aria-label="Decrease quantity" onClick={() => updateQty(item.cartKey || item.id, -1)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button className="cart-qty-btn plus" aria-label="Increase quantity" onClick={() => updateQty(item.cartKey || item.id, 1)}>
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
          <div className="sticky top-5 p-6 rounded-[32px] shadow-sm mb-20" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <h3 className="text-lg font-black text-bold mb-6">{lang === 'kh' ? 'សង្ខេប' : 'Summary'}</h3>
            
            {/* Promo Code Section */}
            <div className="mb-6 pb-6 border-b border-dashed" style={{ borderColor: 'var(--border-subtle)' }}>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <input 
                  type="text" 
                  style={{
                    width: '100%',
                    padding: '12px 85px 12px 14px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-soft)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontWeight: '800',
                    outline: 'none',
                    textTransform: 'uppercase',
                    boxSizing: 'border-box'
                  }}
                  placeholder={lang === 'kh' ? 'លេខកូដបញ្ចុះតម្លៃ' : 'PROMO CODE'}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  disabled={promoLoading || validatedPromo}
                />
                {!validatedPromo ? (
                  <button 
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '4px',
                      bottom: '4px',
                      padding: '0 16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '900',
                      cursor: (promoLoading || !promoInput.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (promoLoading || !promoInput.trim()) ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center'
                    }}
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoInput.trim()}
                  >
                    {promoLoading ? '...' : (lang === 'kh' ? 'ប្រើ' : 'Apply')}
                  </button>
                ) : (
                  <button 
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '4px',
                      bottom: '4px',
                      padding: '0 12px',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '900',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center'
                    }}
                    onClick={() => { setValidatedPromo(null); setPromoInput(''); }}
                  >
                    {lang === 'kh' ? 'លុប' : 'Remove'}
                  </button>
                )}
              </div>
              {promoError && <div className="text-red-500 text-xs font-bold mt-2 ml-1">{promoError}</div>}
              {validatedPromo && <div className="text-[#059669] text-xs font-bold mt-2 ml-1 flex items-center gap-1">✅ {lang === 'kh' ? 'បានប្រើប្រាស់ជោគជ័យ' : 'Coupon applied!'}</div>}
            </div>

            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-dashed" style={{ borderColor: 'var(--border-subtle)' }}>
              {cart.map(item => {
                const best = calculateBestDiscount(item, activeDiscounts);
                const dPrice = best ? getDiscountedPrice(item, best) : null;
                return (
                  <div key={item.id} className="flex justify-between items-baseline text-[15px] font-bold">
                <div className="truncate max-w-[140px] tracking-tight">{item.name} x {item.quantity}</div>
                <div className="font-black tabular-nums">
                  {dPrice ? `$${(dPrice * item.quantity).toFixed(2)}` : `$${(item.price * item.quantity).toFixed(2)}`}
                </div>
              </div>
            );
          })}
          
          {validatedPromo && (
            <div className="flex justify-between items-center text-[15px] font-bold mt-2 text-[#ec4899]">
              <div className="uppercase tracking-tight flex items-center gap-1">🎟️ {validatedPromo.code}</div>
              <div className="font-black tabular-nums">-${manualDiscount.toFixed(2)}</div>
            </div>
          )}

          <div className="flex justify-between items-center text-[15px] font-bold mt-2">
            <div className="uppercase tracking-tight">{lang === 'kh' ? 'សេវាដឹកជញ្ជូន' : 'DELIVERY'}</div>
            <div className={`font-black tabular-nums ${isFreeDelivery ? 'text-[#059669]' : ''}`}>
              {formatDeliveryFeeLabel(appliedFee, lang)}
            </div>
          </div>
          {amountToFreeDelivery > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 6 }}>
              {lang === 'kh'
                ? `ទិញបន្ថែម $${amountToFreeDelivery.toFixed(2)} ដើម្បីដឹកហ្វ្រី`
                : `Add $${amountToFreeDelivery.toFixed(2)} more for free delivery`}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-black uppercase text-bold">{lang === 'kh' ? 'សរុប៖' : 'TOTAL:'}</span>
          <span className="text-2xl font-black text-[#059669] tabular-nums">${finalTotal.toFixed(2)}</span>
        </div>
        <button
          className={`w-full py-[18px] flex items-center justify-center gap-3 bg-[#059669] text-white rounded-xl font-black uppercase tracking-wider shadow-md transition-all ${isPlacingOrder ? 'opacity-75 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'} ${(step === 2 && (!isPhoneValid || !isAddressValid)) ? 'opacity-50 grayscale' : ''}`}
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
