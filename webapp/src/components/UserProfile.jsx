import React, { useEffect, useState } from 'react';
import ProfileCard from './ui/ProfileCard';
import CambodiaAddress from './ui/CambodiaAddress';

/**
 * 💎 High-Fidelity User Profile & Order History
 * Implements the "Timeline of Excellence" design system.
 */
const UserProfile = ({ user, setView, BACKEND_URL, onViewInvoice, t, lang, toggleLang, theme, toggleTheme }) => {
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

  useEffect(() => {
    fetchOrders();
    fetchFaqs();
    fetchProfile();
  }, [user?.id]);

  const fetchProfile = () => {
    if (!user?.id) return;
    fetch(`${BACKEND_URL}/api/user/profile`, {
       headers: { 'Authorization': `tma ${window.Telegram.WebApp.initData}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.profile) {
        setDbProfile(data.profile);
        setEditPhone(data.profile.phone || '');
        setEditAddress(data.profile.address || '');
      }
    })
    .catch(err => console.error('Failed to fetch profile:', err));
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `tma ${window.Telegram.WebApp.initData}` 
        },
        body: JSON.stringify({ phone: editPhone, address: editAddress })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setDbProfile(data.profile);
        setIsEditingProfile(false);
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
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
    fetch(`${BACKEND_URL}/api/user/orders`, {
       headers: { 'X-TG-Data': window.Telegram.WebApp.initData }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders(data.orders);
      }
      setLoading(false);
    })
    .catch(() => setLoading(false));
  };

  const submitReview = async (productId) => {
    const data = ratingData[productId];
    if (!data || !data.rating) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `tma ${window.Telegram.WebApp.initData}`
        },
        body: JSON.stringify({
          product_id: productId,
          rating: data.rating,
          comment: data.comment || ''
        })
      });
      const result = await res.json();
      if (result.success) {
        setRatingData(prev => {
          const next = { ...prev };
          next[productId].submitted = true;
          return next;
        });
        const tg = window.Telegram.WebApp;
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } finally { setIsSubmitting(false); }
  };

  const orderStatuses = {
    'pending': { label: t('pending_payment'), color: '#94a3b8', icon: '⏳', step: 1 },
    'paid': { label: lang === 'kh' ? 'បង់រួច' : 'Paid', color: '#10b981', icon: '💰', step: 1 },
    'processing': { label: lang === 'kh' ? 'រៀបចំ' : 'Packing', color: '#f59e0b', icon: '📦', step: 2 },
    'shipped': { label: lang === 'kh' ? 'ចេញហាង' : 'Shipped', color: '#a855f7', icon: '✨', step: 3 },
    'delivering': { label: lang === 'kh' ? 'ប្រគល់ឱ្យដឹក' : 'Delivering', color: '#3b82f6', icon: '🚚', step: 4 },
    'delivered': { label: lang === 'kh' ? 'បានទទួល' : 'Delivered', color: '#10b981', icon: '🏠', step: 4 }
  };

  if (!user) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="history-page-luxury">
      
      <div className="history-header-lux" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setView('home')} className="back-btn-pill">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="detail-title-mega" style={{ fontSize: 24, margin: 0 }}>{t('my_account')}</h1>
        </div>
        
        <div className="hero-actions-right">
           <div className="lang-switcher-pill" onClick={toggleLang} style={{ height: 38, padding: '0 12px' }}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="lang-icon-img" style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 12 }}>{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>
           <div className="theme-toggle-pill" onClick={toggleTheme} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              {theme === 'dark' ? '☀️' : '🌙'}
           </div>
        </div>
      </div>

      <ProfileCard 
        name={`${user?.first_name || 'MO MO LOVER'} ${user?.last_name || ''}`}
        role={`Premium Member #${String(user?.id).slice(-4)}`}
        imageUrl={user?.photo_url || `https://ui-avatars.com/api/?name=${user?.first_name || 'User'}&background=random`}
      />

      {dbProfile && (
        <div className="glass-card-luxury" style={{ marginBottom: 30, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{lang === 'kh' ? 'ព័ត៌មានរបស់ខ្ញុំ' : 'My Information'}</div>
            {!isEditingProfile ? (
              <button onClick={() => setIsEditingProfile(true)} style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: 12, fontWeight: 900 }}>
                {lang === 'kh' ? 'កែប្រែ' : 'Edit'}
              </button>
            ) : (
              <button onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, fontWeight: 900 }}>
                {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🎁
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>{lang === 'kh' ? 'ពិន្ទុសន្សំ (Loyalty Points)' : 'Loyalty Points'}</div>
              <div style={{ fontSize: 18, fontWeight: 950, color: '#f59e0b' }}>{dbProfile.loyalty_points || 0} pts</div>
            </div>
          </div>

          {!isEditingProfile ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ opacity: 0.6, marginRight: 8 }}>📞</span> 
                <span style={{ fontWeight: 800 }}>{dbProfile.phone || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ opacity: 0.6, marginRight: 8 }}>📍</span> 
                <span style={{ fontWeight: 800 }}>{dbProfile.address || (lang === 'kh' ? 'មិនទាន់មាន' : 'Not set')}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 15 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, marginBottom: 5, display: 'block' }}>
                  {lang === 'kh' ? 'លេខទូរស័ព្ទ' : 'Phone Number'}
                </label>
                <input 
                  type="tel"
                  className="input-glass-admin" 
                  style={{ width: '100%', fontSize: 14 }}
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="012 345 678"
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, marginBottom: 5, display: 'block' }}>
                  {lang === 'kh' ? 'អាសយដ្ឋានដឹកជញ្ជូន' : 'Delivery Address'}
                </label>
                <div style={{ background: 'var(--bg-soft)', padding: 15, borderRadius: 16 }}>
                  <CambodiaAddress 
                    value={editAddress}
                    onChange={(val) => setEditAddress(val)}
                    lang={lang}
                  />
                </div>
              </div>
              <button 
                className="detail-btn-buy-luxury" 
                onClick={saveProfile}
                disabled={isSavingProfile}
                style={{ height: 44, fontSize: 14, marginTop: 5 }}>
                {isSavingProfile ? '⌛...' : (lang === 'kh' ? 'រក្សាទុក' : 'Save Profile')}
              </button>
            </div>
          )}
        </div>
      )}


       <div className="section-header" style={{ padding: '0 0 15px' }}>
         <h2 style={{ fontSize: 18, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'ប្រវត្តិទិញទំនិញ' : 'Purchase History'}</h2>
         <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 800 }}>
           {orders.filter(o => o.status !== 'pending' && o.status !== 'expired').length} {t('items')}
         </span>
       </div>

       {loading ? (
         <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>
       ) : orders.filter(o => o.status !== 'pending' && o.status !== 'expired').length === 0 ? (
         <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--bg-soft)', borderRadius: 28, marginBottom: 20, border: '1.5px dashed var(--border-subtle)' }}>
            <div style={{ fontSize: 44, marginBottom: 15, opacity: 0.9 }}>🛍️</div>
            <p style={{ opacity: 0.9, fontWeight: 900, fontSize: 14, color: 'var(--text-main)' }}>{lang === 'kh' ? 'មិនទាន់មានការទិញទេ' : 'No purchase history yet'}</p>
         </div>
       ) : (
        <div className="history-list">
          {orders.filter(o => o.status !== 'pending' && o.status !== 'expired').map(order => {
            const status = orderStatuses[order.status] || { label: order.status, icon: '📦', color: '#94a3b8', step: 1 };
            const isDelivered = order.status === 'delivered';
            
            return (
              <div 
                key={order.id} 
                className="order-card-luxury animate-up"
                style={{ marginBottom: 20, position: 'relative' }}
                onClick={() => onViewInvoice(order)}
              >
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('order_id')}</div>
                       <div style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)' }}>
                          MO-{String(order.id).padStart(5, '0')}
                       </div>
                    </div>
                    <div className="pill-badge" style={{ background: `${status.color}15`, color: status.color, border: `1.5px solid ${status.color}20`, fontWeight: 950 }}>
                       {status.icon} {status.label}
                    </div>
                 </div>

                 {!isDelivered && (
                    <div className="premium-timeline-lux" style={{ margin: '25px 0' }}>
                       <div className="timeline-track-bg"></div>
                       <div className="timeline-track-fill" style={{ width: `${Math.max(0, (status.step - 1) * 33.33)}%`, background: status.color }}></div>
                       <div className="timeline-steps-lux">
                          {[
                            { step: 1, icon: '💰', kh: 'បង់រួច', en: 'Paid' },
                            { step: 2, icon: '📦', kh: 'រៀបចំ', en: 'Packing' },
                            { step: 3, icon: '✨', kh: 'ចេញហាង', en: 'Shipped' },
                            { step: 4, icon: '🚚', kh: 'ដឹកជញ្ជូន', en: 'Moving' }
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
                       <div style={{ fontSize: 24 }}>🚚</div>
                       <div className="tracking-info-lux">
                          <div className="tracking-label-lux">{lang === 'kh' ? 'លេខតាមដានអីវ៉ាន់' : 'Courier Tracking'}</div>
                          <div className="tracking-code-lux">{order.tracking_number}</div>
                       </div>
                       <div className="copy-btn-lux" onClick={() => {
                         navigator.clipboard.writeText(order.tracking_number);
                         const tg = window.Telegram.WebApp;
                         if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                       }}>📋</div>
                    </div>
                 )}

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <div>
                       <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t('total')}</div>
                       <div className="mega-price-primary" style={{ fontSize: 24 }}>${parseFloat(order.total_amount || 0).toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                       {isDelivered && (
                          <button 
                             onClick={(e) => { e.stopPropagation(); setRatingOrder(order); }}
                             className="detail-btn-cart-luxury" 
                             style={{ padding: '0 16px', borderRadius: 14, height: 44, background: 'var(--primary-gradient)', color: 'white', border: 'none', fontWeight: 900 }}>
                             ⭐️ {lang === 'kh' ? 'វាយតម្លៃ' : 'Rate'}
                          </button>
                       )}
                       <button className="icon-btn-glass primary-fill" style={{ width: 'auto', padding: '0 20px', borderRadius: 16, height: 48, fontSize: 13, fontWeight: 900, gap: 10 }}>
                          <span>🧾</span> {t('view_receipt')}
                       </button>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ⭐️ Rating Modal */}
      {ratingOrder && (
        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
           <div className="order-card-luxury animate-up" style={{ width: '90%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                 <h2 style={{ fontSize: 20, fontWeight: 950 }}>{lang === 'kh' ? 'វាយតម្លៃទំនិញ' : 'Rate Your Items'}</h2>
                 <button onClick={() => setRatingOrder(null)} style={{ background: 'none', border: 'none', fontSize: 24 }}>✕</button>
              </div>

              {JSON.parse(ratingOrder.items || '[]').map((item, idx) => {
                 const data = ratingData[item.id] || { rating: 5, comment: '', submitted: false };
                 return (
                    <div key={idx} style={{ marginBottom: 25, paddingBottom: 25, borderBottom: '1px solid var(--border-subtle)' }}>
                       <div style={{ fontWeight: 900, marginBottom: 12 }}>{item.name}</div>
                       
                       {data.submitted ? (
                          <div style={{ color: '#10b981', fontWeight: 900, fontSize: 13 }}>✅ {lang === 'kh' ? 'អរគុណសម្រាប់ការវាយតម្លៃ!' : 'Thank you for your rating!'}</div>
                       ) : (
                          <>
                             <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
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
                                className="input-glass-admin" 
                                style={{ background: 'var(--bg-soft)', borderRadius: 12, fontSize: 13 }}
                                placeholder={lang === 'kh' ? 'សរសេមតិយោបល់...' : 'Write a comment...'}
                                value={data.comment}
                                onChange={(e) => setRatingData(prev => ({ ...prev, [item.id]: { ...data, comment: e.target.value } }))}
                             />
                             <button 
                                onClick={() => submitReview(item.id)}
                                className="detail-btn-buy-luxury" 
                                style={{ marginTop: 15, height: 44, fontSize: 13 }}>
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
      {faqs.length > 0 && (
         <div className="faq-section-lux" style={{ marginTop: 30 }}>
            <div className="section-header" style={{ padding: '0 0 20px' }}>
               <h2 style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-bold)' }}>{lang === 'kh' ? 'សំណួរដែលសួរញឹកញាប់' : 'FAQs'}</h2>
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

      </div>
  );
};

export default UserProfile;
