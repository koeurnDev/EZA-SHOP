import React, { useEffect, useState, useMemo } from 'react';
import ProfileCard from './ui/ProfileCard';
import CambodiaAddress from './ui/CambodiaAddress';
import { useShopState } from '../context/ShopContext';
import { isPaymentConfirmed, isUserPurchaseHistoryOrder } from '../utils/orderItemUtils';
import { openExternalLink, buildSocialLinkItems, buildTelLink, buildMapsLink } from '../utils/socialLinkUtils';
import SocialBrandIcon from './ui/SocialBrandIcon';

/**
 * 💎 High-Fidelity User Profile & Order History
 * Implements the "Timeline of Excellence" design system.
 */
const UserProfile = ({ user, setView, BACKEND_URL, onViewInvoice, t, lang, toggleLang, theme, toggleTheme, wishlistCount = 0 }) => {
  const {
    socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa,
    shopPhone, shopAddress, shopHours, shopLogoUrl, shopName,
    settings,
  } = useShopState();
  const socialLinks = useMemo(
    () => buildSocialLinkItems({ socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa }),
    [socialFb, socialTg, socialIg, socialTt, socialEmail, socialWa]
  );
  const hasContactSection = socialLinks.length > 0 || shopPhone || shopAddress || shopHours;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingData, setRatingData] = useState({}); // { productId: { rating, comment } }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [faqs, setFaqs] = useState([]);
  
  // Profile Data State
  const [dbProfile, setDbProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Redeem Points State
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedCoupon, setRedeemedCoupon] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchFaqs();
    fetchProfile();
  }, [user?.id]);

  const sanitizeText = (val) => {
    if (!val || typeof val !== 'string') return '';
    if (val.includes(':') || val.length > 40 || /^[0-9a-fA-F:]{30,}$/.test(val)) return '';
    return val;
  };

  const fetchProfile = () => {
    if (!user?.id) return;
    const tgInitData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/user/profile`, {
       headers: { 'X-TG-Data': tgInitData, 'X-Debug-Bypass': 'true' }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.profile) {
        const cleanPhone = sanitizeText(data.profile.phone);
        const cleanAddr = sanitizeText(data.profile.address);
        setDbProfile({ ...data.profile, phone: cleanPhone, address: cleanAddr });
        setEditPhone(cleanPhone);
        setEditAddress(cleanAddr);
      }
    })
    .catch(err => console.error('Failed to fetch profile:', err));
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': tgInitData,
          'X-Debug-Bypass': 'true'
        },
        body: JSON.stringify({ phone: editPhone, address: editAddress })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        const cleanPhone = sanitizeText(data.profile.phone);
        const cleanAddr = sanitizeText(data.profile.address);
        setDbProfile({ ...data.profile, phone: cleanPhone, address: cleanAddr });
        setIsEditingProfile(false);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRedeemPoints = async () => {
    if ((dbProfile?.loyalty_points || 0) < 100) return;
    
    if (!window.confirm(lang === 'kh' ? 'តើអ្នកពិតជាចង់ប្ដូរ ១០០ពិន្ទុ យកគូប៉ុងបញ្ចុះតម្លៃ $2 មែនទេ?' : 'Exchange 100 points for a $2 discount coupon?')) return;

    setIsRedeeming(true);
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/user/redeem-points`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': tgInitData,
          'X-Debug-Bypass': 'true'
        }
      });
      const data = await res.json();
      if (data.success) {
        setDbProfile(prev => ({ ...prev, loyalty_points: data.new_balance }));
        setRedeemedCoupon(data.coupon_code);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        alert(data.error || (lang === 'kh' ? 'ប្ដូរពិន្ទុមិនជោគជ័យ' : 'Failed to redeem points'));
      }
    } catch (err) {
      console.error('Redeem points error:', err);
      alert(lang === 'kh' ? 'មានបញ្ហាក្នុងការប្ដូរពិន្ទុ' : 'Error redeeming points');
    } finally {
      setIsRedeeming(false);
    }
  };

  const fetchFaqs = () => {
    fetch(`${BACKEND_URL}/api/faqs`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFaqs(data.faqs);
        }
      })
      .catch(err => console.error('Failed to fetch FAQs:', err));
  };

  const fetchOrders = () => {
    if (!user?.id) return;
    const tgInitData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/user/orders`, {
       headers: { 'X-TG-Data': tgInitData, 'X-Debug-Bypass': 'true' }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders((data.orders || []).filter(o => isUserPurchaseHistoryOrder(o.status)));
      }
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch orders:', err);
      setLoading(false);
    });
  };

  const submitReview = async (productId) => {
    const data = ratingData[productId] || { rating: 5, comment: '' };
    if (!data.rating) return;

    setIsSubmitting(true);
    try {
      const tgInitData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-TG-Data': tgInitData,
          'X-Debug-Bypass': 'true'
        },
        body: JSON.stringify({
          product_id: productId,
          rating: data.rating,
          comment: data.comment || ''
        })
      });
      const result = await res.json();
      if (result.success) {
        setRatingData(prev => ({
          ...prev,
          [productId]: { ...data, submitted: true }
        }));
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      } else {
        alert(result.error || 'Failed to submit review');
      }
    } finally { setIsSubmitting(false); }
  };

  const orderStatuses = {
    'pending':    { label: t('pending_payment'),                              color: '#94a3b8', icon: '⏳', step: 0 },
    'paid':       { label: lang === 'kh' ? 'បង់រួច'     : 'Paid',      color: '#10b981', icon: '✓',  step: 1 },
    'processing': { label: lang === 'kh' ? 'រៀបចំ'       : 'Packing',   color: '#f59e0b', icon: '📦', step: 2 },
    'shipped':    { label: lang === 'kh' ? 'កំពុងដឹក'    : 'Courier',   color: '#a855f7', icon: '🚚', step: 3 },
    'delivering': { label: lang === 'kh' ? 'កំពុងដឹក'    : 'Courier',   color: '#3b82f6', icon: '🚚', step: 3 },
    'delivered':  { label: lang === 'kh' ? 'បានដល់'     : 'Delivered',  color: '#10b981', icon: '🏠', step: 3 }
  };

  if (!user) {
    return (
      <div className="text-center py-[60px] px-5 flex flex-col items-center justify-center h-[60vh]">
        <div className="text-[48px] mb-4">📱</div>
        <h2 className="text-[20px] font-black mb-2 text-[var(--text-bold)]">
          {lang === 'kh' ? 'ត្រូវការកម្មវិធី Telegram' : 'Telegram App Required'}
        </h2>
        <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">
          {lang === 'kh' 
            ? 'សូមបើកកម្មវិធីនេះតាមរយៈ Telegram Mini App ដើម្បីចូលមើលគណនីរបស់អ្នក។' 
            : 'Please open this app inside Telegram to view your profile and order history.'}
        </p>
      </div>
    );
  }

  return (
    <div className="history-page-luxury">
      
      <div className="history-header-lux flex justify-between items-center">
        <div className="flex items-center gap-[10px]">
           <button type="button" onClick={() => setView('home')} className="back-btn-pill back-btn-pill--icon" aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="profile-page-title">{t('my_account')}</h1>
        </div>
        
        <div className="hero-actions-right">
           <div className="lang-switcher-pill" onClick={toggleLang} role="button" tabIndex={0}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="lang-icon-img" />
              <span>{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>
           <div className="theme-toggle-pill" onClick={toggleTheme} role="button" tabIndex={0}>
              {theme === 'dark' ? '☀️' : '🌙'}
           </div>
        </div>
      </div>

      <ProfileCard 
        name={`${user?.first_name || 'VIBE LOVER'} ${user?.last_name || ''}`}
        role={`Premium Member #${String(user?.id).slice(-4)}`}
        imageUrl={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name || 'User'}&background=random`}
      />

      {dbProfile && (
        <div className="mb-6 p-4 bg-[var(--bg-surface)] rounded-[20px] border border-[var(--border-subtle)]">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[16px] font-black flex items-center gap-1.5 m-0">
              {dbProfile.vip_tier === 'diamond' ? '💎 Diamond VIP' : dbProfile.vip_tier === 'gold' ? '🥇 Gold VIP' : dbProfile.vip_tier === 'silver' ? '🥈 Silver VIP' : '🔰 Standard Member'}
            </h3>
            {dbProfile.vip_tier !== 'none' && (
               <span className="text-[12px] font-extrabold text-[#8b5cf6]">
                  {dbProfile.vip_tier === 'diamond' ? '15% OFF' : dbProfile.vip_tier === 'gold' ? '10% OFF' : '5% OFF'}
               </span>
            )}
          </div>
          
          {dbProfile.vip_tier !== 'diamond' && (
            <>
               <div className="h-2 bg-[var(--bg-soft)] rounded overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ 
                     width: `${Math.min(100, (dbProfile.total_spent / (dbProfile.vip_tier === 'none' ? 100 : dbProfile.vip_tier === 'silver' ? 500 : 1000)) * 100)}%` 
                  }}></div>
               </div>
               <p className="text-[12px] text-[var(--text-muted)] font-semibold m-0">
                  {lang === 'kh' ? 'ទិញបន្ថែម ' : 'Spend '}
                  <b className="text-[var(--text-main)]">
                     ${Math.max(0, (dbProfile.vip_tier === 'none' ? 100 : dbProfile.vip_tier === 'silver' ? 500 : 1000) - dbProfile.total_spent).toFixed(2)}
                  </b>
                  {lang === 'kh' ? ' ទៀតដើម្បីឡើងកម្រិត ' : ' more to reach '}
                  <b>{dbProfile.vip_tier === 'none' ? 'Silver' : dbProfile.vip_tier === 'silver' ? 'Gold' : 'Diamond'}</b>
               </p>
            </>
          )}
        </div>
      )}

      <button type="button" className="profile-favorites-link" onClick={() => setView('wishlist')}>
        <span className="profile-favorites-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.82-8.82 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </span>
        <span className="profile-favorites-text">
          {lang === 'kh' ? 'សំណព្វ' : 'Favorites'}
        </span>
        <span className="profile-favorites-count">{wishlistCount}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="referral-card-lux mb-6 p-5 bg-[var(--bg-surface)] rounded-[20px] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)] text-center relative overflow-hidden">
        <div className="absolute -top-[30px] -left-[30px] w-[100px] h-[100px] bg-[var(--primary-accent)] blur-[50px] opacity-15 pointer-events-none"></div>
        <h3 className="text-[17px] font-black mb-2 text-[var(--text-bold)] flex items-center justify-center gap-1.5">
          <span className="text-[20px]">🎁</span> {lang === 'kh' ? 'ណែនាំមិត្តភក្ដិ' : 'Refer a Friend'} <span className="text-[var(--primary-accent)] text-[13px] bg-[var(--bg-soft)] px-2 py-0.5 rounded-[10px]">+10 pts</span>
        </h3>
        <p className="text-[13px] text-[var(--text-muted)] mb-4 leading-relaxed">
          {lang === 'kh' ? 'ចម្លងតំណភ្ជាប់ខាងក្រោមផ្ញើទៅមិត្តភក្ដិរបស់អ្នក។ អ្នកទាំងពីរនឹងទទួលបាន 10 ពិន្ទុបន្ទាប់ពីពួកគេទិញទំនិញលើកដំបូង!' : 'Copy the link below and send it to your friends. You both get 10 points after their first purchase!'}
        </p>
        <div className="flex gap-2 items-center bg-[var(--bg-soft)] p-1.5 rounded-2xl border border-[var(--border-subtle)]">
          <input 
            type="text" 
            readOnly 
            value={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'Vibe_Lifestyle_Bot'}/app?startapp=ref_${user?.id}`} 
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border-none bg-transparent text-[13px] text-[var(--text-main)] outline-none min-w-0 font-medium"
          />
          <button 
            type="button"
            className="px-[18px] py-[10px] rounded-xl bg-[var(--primary-gradient)] text-white font-extrabold text-[13px] border-none flex items-center gap-1.5 shrink-0 cursor-pointer shadow-[0_4px_12px_rgba(255,114,160,0.25)]"
            onClick={() => {
              navigator.clipboard.writeText(`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'Vibe_Lifestyle_Bot'}/app?startapp=ref_${user?.id}`);
              const tg = window.Telegram?.WebApp;
              if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
              alert(lang === 'kh' ? 'បានចម្លង!' : 'Copied!');
            }}
          >
            📋 {lang === 'kh' ? 'ចម្លង' : 'Copy'}
          </button>
        </div>
      </div>

      {dbProfile && (
        <div className="glass-card-luxury profile-info-card">
          <div className="profile-info-head">
            <div className="profile-info-title">{lang === 'kh' ? 'ព័ត៌មានរបស់ខ្ញុំ' : 'My Information'}</div>
            {!isEditingProfile ? (
              <button type="button" className="profile-info-edit-btn" onClick={() => setIsEditingProfile(true)}>
                {lang === 'kh' ? 'កែប្រែ' : 'Edit'}
              </button>
            ) : (
              <button type="button" className="profile-info-cancel-btn" onClick={() => setIsEditingProfile(false)}>
                {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
              </button>
            )}
          </div>

          <div className="profile-loyalty-row flex flex-col gap-[15px]">
            <div className="flex items-center gap-[15px]">
              <div className="profile-loyalty-icon">pts</div>
              <div className="flex-1">
                <div className="profile-loyalty-label">{lang === 'kh' ? 'ពិន្ទុសន្សំ' : 'Loyalty Points'}</div>
                <div className="profile-loyalty-value">{dbProfile.loyalty_points || 0} pts</div>
              </div>
              {dbProfile.loyalty_points >= 100 && !redeemedCoupon && (
                <button 
                  type="button" 
                  className="profile-save-btn w-auto px-4 py-2 text-[13px] m-0 h-auto"
                  onClick={handleRedeemPoints}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? '...' : (lang === 'kh' ? 'ប្ដូរយកគូប៉ុង $2' : 'Redeem $2')}
                </button>
              )}
            </div>
            
            {redeemedCoupon && (
              <div className="bg-[var(--bg-app)] p-[15px] rounded-xl border border-dashed border-[var(--primary-accent)] text-center">
                <div className="text-[13px] font-extrabold text-[var(--text-muted)] mb-2">
                  {lang === 'kh' ? 'គូប៉ុងបញ្ចុះតម្លៃ $2 របស់អ្នក' : 'Your $2 Discount Coupon'}
                </div>
                <div className="text-[20px] font-black text-[var(--primary-accent)] tracking-[2px]">
                  {redeemedCoupon}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-2">
                  {lang === 'kh' ? 'សូមចម្លងកូដនេះទៅប្រើនៅពេលទូទាត់ប្រាក់' : 'Copy this code to use at checkout'}
                </div>
              </div>
            )}
            
            {dbProfile.loyalty_points < 100 && !redeemedCoupon && (
               <div className="text-[12px] text-[var(--text-muted)] font-semibold">
                 {lang === 'kh' ? `ត្រូវការ ${100 - dbProfile.loyalty_points} ពិន្ទុទៀត ដើម្បីប្ដូរយកគូប៉ុង $2` : `Need ${100 - dbProfile.loyalty_points} more points to redeem a $2 coupon`}
               </div>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="profile-info-view">
              <div className="profile-info-line">
                <span className="profile-info-line-label">{lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone'}</span>
                <span className="profile-info-line-value">{sanitizeText(dbProfile.phone) || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
              <div className="profile-info-line">
                <span className="profile-info-line-label">{lang === 'kh' ? 'អាសយដ្ឋាន' : 'Address'}</span>
                <span className="profile-info-line-value">{sanitizeText(dbProfile.address) || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
            </div>
          ) : (
            <div className="profile-info-form">
              <div>
                <label className="profile-form-label">
                  {lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  className="input-glass-admin profile-form-input"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="012 345 678"
                />
              </div>
              <div>
                <label className="profile-form-label">
                  {lang === 'kh' ? 'អាសយដ្ឋានដឹកជញ្ជូន' : 'Delivery Address'}
                </label>
                <div className="profile-address-box">
                  <CambodiaAddress
                    value={editAddress}
                    onChange={(val) => setEditAddress(val)}
                    lang={lang}
                  />
                </div>
              </div>
              <button
                type="button"
                className="profile-save-btn"
                onClick={saveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (lang === 'kh' ? 'កំពុងរក្សាទុក...' : 'Saving...') : (lang === 'kh' ? 'រក្សាទុក' : 'Save')}
              </button>
            </div>
          )}
        </div>
      )}


       <div className="section-header pb-4">
         <h2 className="text-[18px] font-black text-[var(--text-bold)]">{lang === 'kh' ? 'ប្រវត្តិការទិញ' : 'Purchase History'}</h2>
         <span className="text-[13px] text-[var(--text-muted)] font-extrabold">
           {orders.filter(isUserPurchaseHistoryOrder).length} {t('items')}
         </span>
       </div>

       {loading ? (
         <div className="h-[200px] flex items-center justify-center"><div className="loader"></div></div>
       ) : orders.filter(isUserPurchaseHistoryOrder).length === 0 ? (
         <div className="text-center py-[60px] bg-[var(--bg-soft)] rounded-[20px] mb-5 border-[1.5px] border-dashed border-[var(--border-subtle)]">
            <div className="text-[44px] mb-4 opacity-90">🛍️</div>
            <p className="opacity-90 font-black text-[14px] text-[var(--text-main)]">{lang === 'kh' ? 'មិនទាន់មានការទិញទេ' : 'No purchase history yet'}</p>
         </div>
       ) : (
        <div className="history-list">
          {orders.filter(isUserPurchaseHistoryOrder).map(order => {
            const status = orderStatuses[order.status] || { label: order.status, icon: '📦', color: '#94a3b8', step: 0 };
            const isDelivered = order.status === 'delivered';
            const canRate = ['shipped', 'delivering', 'delivered'].includes(order.status);
            const paymentConfirmed = isPaymentConfirmed(order.status);
            const showTracker = paymentConfirmed && !isDelivered && !canRate;
            
            return (
              <div 
                key={order.id} 
                className={`order-card-luxury animate-up mb-4 relative ${paymentConfirmed ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => paymentConfirmed && onViewInvoice(order)}
              >
                 <div className="order-meta-lux mb-4">
                    <div>
                       <div className="text-[11px] font-bold text-[var(--text-muted)] mb-1">
                         {lang === 'kh' ? 'លេខសម្គាល់' : 'Order ID'}
                       </div>
                       <div className="order-id-numeric">
                          {order.order_code || String(order.id)}
                       </div>
                    </div>
                    <div className="pill-badge" style={{ background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}30`, fontWeight: 800, fontSize: 12 }}>
                       {status.icon} {status.label}
                    </div>
                 </div>

                 {showTracker && (
                    <div className="premium-timeline-lux my-[18px] mb-2">
                       <div className="timeline-track-bg"></div>
                       <div className="timeline-track-fill" style={{ width: `${Math.max(0, (status.step - 1) * 50)}%`, background: status.color }}></div>
                       <div className="timeline-steps-lux">
                          {[
                            { step: 1, icon: '✓', kh: 'បង់រួច', en: 'Paid' },
                            { step: 2, icon: '📦', kh: 'រៀបចំ', en: 'Packing' },
                            { step: 3, icon: '🚚', kh: 'កំពុងដឹក', en: 'Courier' }
                          ].map((s, i) => {
                             const isActive = s.step <= status.step;
                             const isCurrent = s.step === status.step;
                             return (
                                <div key={i} className="timeline-node-lux">
                                   <div className={`node-circle-lux ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`} style={isActive ? { background: status.color } : {}}>
                                      {isActive ? (isCurrent ? s.icon : '✓') : s.icon}
                                      {isCurrent && <div className="pulse-node-lux" style={{ color: status.color }}></div>}
                                   </div>
                                   <div className={`node-label-lux ${isActive ? 'active' : ''}`}>
                                      {lang === 'kh' ? s.kh : s.en}
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 )}

                 {order.tracking_number && (
                    <div className="tracking-pill-lux" onClick={(e) => e.stopPropagation()}>
                       <div className="text-[20px]">🚚</div>
                       <div className="tracking-info-lux">
                          <div className="tracking-label-lux">{lang === 'kh' ? 'លេខតាមដាន' : 'Tracking'}</div>
                          <div className="tracking-code-lux">{order.tracking_number}</div>
                       </div>
                       <div className="copy-btn-lux" onClick={() => {
                         navigator.clipboard.writeText(order.tracking_number);
                         const tg = window.Telegram?.WebApp;
                         if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                       }}>📋</div>
                    </div>
                 )}

                 <div className="order-card-footer">
                    <div>
                       <div className="text-[11px] font-bold text-[var(--text-muted)] mb-0.5">
                         {lang === 'kh' ? 'សរុប' : 'Total'}
                       </div>
                       <div className="mega-price-primary text-[22px]">
                         ${parseFloat(order.total || order.total_amount || 0).toFixed(2)}
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                       {canRate && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); setRatingOrder(order); }}
                             className="order-action-btn order-action-btn-primary">
                             ★ {lang === 'kh' ? 'វាយតម្លៃ' : 'Rate'}
                          </button>
                       )}
                       {paymentConfirmed && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); onViewInvoice(order); }}
                             className="order-action-btn">
                             {lang === 'kh' ? 'វិក្កយបត្រ' : 'Receipt'}
                          </button>
                       )}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⭐️ Rating Modal */}
      {ratingOrder && (
        <div className="modal-overlay z-[9999] flex items-center justify-center bg-black/80">
           <div className="order-card-luxury animate-up w-[90%] max-w-[400px] max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between mb-5">
                 <h2 className="text-[20px] font-black">{lang === 'kh' ? 'វាយតម្លៃទំនិញ' : 'Rate Your Items'}</h2>
                 <button onClick={() => setRatingOrder(null)} className="bg-none border-none text-[24px]">✕</button>
              </div>

              {JSON.parse(ratingOrder.items || '[]').map((item, idx) => {
                 const data = ratingData[item.id] || { rating: 5, comment: '', submitted: false };
                 return (
                    <div key={idx} className="mb-6 pb-6 border-b border-[var(--border-subtle)]">
                       <div className="font-black mb-3">{item.name}</div>
                       
                       {data.submitted ? (
                          <div className="text-[#10b981] font-black text-[13px]">✅ {lang === 'kh' ? 'អរគុណសម្រាប់ការវាយតម្លៃ!' : 'Thank you for your rating!'}</div>
                       ) : (
                          <>
                             <div className="flex gap-2 mb-4">
                                {[1,2,3,4,5].map(star => (
                                   <div 
                                      key={star} 
                                      onClick={() => setRatingData(prev => ({ ...prev, [item.id]: { ...data, rating: star } }))}
                                      style={{ fontSize: 28, cursor: 'pointer', filter: star <= data.rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                                      ⭐️
                                   </div>
                                ))}
                             </div>
                             <textarea 
                                className="input-glass-admin bg-[var(--bg-soft)] rounded-xl text-[13px]"
                                placeholder={lang === 'kh' ? 'សរសេរមតិយោបល់...' : 'Write a comment...'}
                                value={data.comment}
                                onChange={(e) => setRatingData(prev => ({ ...prev, [item.id]: { ...data, comment: e.target.value } }))}
                             />
                             <button 
                                onClick={() => submitReview(item.id)}
                                className="detail-btn-buy-luxury mt-4 h-[44px] text-[13px]">
                                {isSubmitting ? '⌛...' : (lang === 'kh' ? 'ផ្ញើមតិ' : 'Submit Review')}
                             </button>
                          </>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* About Us Section */}
      {(settings?.shop_history_kh || settings?.shop_history_en) && (
        <div className="faq-section-lux mt-[30px]">
          <div className="section-header pb-5">
            <h2 className="text-[20px] font-black text-[var(--text-bold)]">{lang === 'kh' ? 'អំពីយើង' : 'About Us'}</h2>
          </div>
          <div className="glass-card-luxury p-5 whitespace-pre-wrap leading-relaxed text-[14px]">
            {lang === 'kh' ? (settings.shop_history_kh || settings.shop_history_en) : (settings.shop_history_en || settings.shop_history_kh)}
          </div>
        </div>
      )}

      {faqs.length > 0 && (
         <div className="faq-section-lux mt-[30px]">
            <div className="section-header pb-5">
               <h2 className="text-[20px] font-black text-[var(--text-bold)]">{lang === 'kh' ? 'សំណួរដែលសួរញឹកញាប់' : 'FAQs'}</h2>
            </div>
            {faqs.map((faq) => (
               <div key={faq.id} className={`faq-item-lux ${activeFaq === faq.id ? 'open' : ''}`}>
                  <button className="faq-trigger-lux" onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}>
                     <span className="faq-q-text">{lang === 'kh' ? faq.q_kh : faq.q_en}</span>
                     <span className="faq-arrow">›</span>
                  </button>
                  <div className="faq-content-lux">
                     <p className="faq-ans-text">{lang === 'kh' ? faq.a_kh : faq.a_en}</p>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* 📱 Contact Us Section */}
      {hasContactSection && (
         <div className="contact-section-lux mt-[30px] pb-[120px]">
            <div className="contact-shop-header contact-link-row">
              <div className="contact-link-icon-slot">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt="" className="contact-shop-logo" />
                ) : (
                  <img src="/logo.webp" alt="Vibe Lifestyle" className="contact-shop-logo" />
                )}
              </div>
              <div className="contact-link-text-block">
                <h2 className="contact-shop-title">
                  {shopName || (lang === 'kh' ? 'ទំនាក់ទំនងយើងខ្ញុំ' : 'Contact Us')}
                </h2>
                <p className="contact-shop-subtitle">
                  {lang === 'kh' ? 'ទាក់ទងយើងតាមរយៈឆានែលណាមួយ' : 'Reach us on any channel'}
                </p>
              </div>
            </div>

            {(shopPhone || shopHours || shopAddress) && (
              <div className="contact-info-rows">
                {shopPhone && (
                  <button type="button" className="contact-info-row" onClick={() => openExternalLink(buildTelLink(shopPhone))}>
                    <span className="contact-info-icon">📞</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ទូរស័ព្ទ' : 'Phone'}</span>
                      <span className="contact-info-value">{shopPhone}</span>
                    </span>
                  </button>
                )}
                {shopHours && (
                  <div className="contact-info-row contact-info-row--static">
                    <span className="contact-info-icon">🕐</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ម៉ោងបើក' : 'Hours'}</span>
                      <span className="contact-info-value">{shopHours}</span>
                    </span>
                  </div>
                )}
                {shopAddress && (
                  <button type="button" className="contact-info-row" onClick={() => openExternalLink(buildMapsLink(shopAddress))}>
                    <span className="contact-info-icon">📍</span>
                    <span className="contact-info-text">
                      <span className="contact-info-label">{lang === 'kh' ? 'ទីតាំង' : 'Address'}</span>
                      <span className="contact-info-value">{shopAddress}</span>
                    </span>
                  </button>
                )}
              </div>
            )}

            {socialLinks.length > 0 && (
              <>
                {(shopPhone || shopHours || shopAddress) && (
                  <>
                    <div className="contact-section-divider" aria-hidden="true" />
                    <p className="contact-social-heading">
                      {lang === 'kh' ? 'បណ្ដាញសង្គម' : 'Social media'}
                    </p>
                  </>
                )}
                <div className="social-links-grid">
                  {socialLinks.map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      className="social-link-chip contact-link-row"
                      onClick={() => openExternalLink(link.url)}
                    >
                      <span className="contact-link-icon-slot">
                        <span
                          className={`social-chip-icon${link.darkIcon ? ' social-chip-icon--dark' : ''}`}
                          style={{ background: link.gradient || link.color }}
                          aria-hidden="true"
                        >
                          <SocialBrandIcon id={link.id} />
                        </span>
                      </span>
                      <span className="social-chip-label contact-link-text-block">{link.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
         </div>
      )}

      </div>
  );
};

export default UserProfile;
