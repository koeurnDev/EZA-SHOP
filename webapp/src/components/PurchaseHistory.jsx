import React, { useEffect, useState } from 'react';
import { isPaymentConfirmed, isUserPurchaseHistoryOrder } from '../utils/orderItemUtils';

const PurchaseHistory = ({ setView, BACKEND_URL }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const orderStatuses = {
    'pending': { label: 'រង់ចាំបង់ប្រាក់', color: '#94a3b8', icon: '⏳', step: 0 },
    'paid': { label: 'បង់រួច', color: '#10b981', icon: '💰', step: 1 },
    'processing': { label: 'រៀបចំ', color: '#f59e0b', icon: '📦', step: 2 },
    'shipped': { label: 'ចេញហាង', color: '#a855f7', icon: '✨', step: 3 },
    'delivering': { label: 'កំពុងដឹក', color: '#3b82f6', icon: '🚚', step: 3 },
    'delivered': { label: 'បានដល់', color: '#10b981', icon: '🏠', step: 3 }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    const tgData = window.Telegram?.WebApp?.initData || '';
    fetch(`${BACKEND_URL}/api/user/orders`, {
      headers: { 
        'X-TG-Data': tgData,
        'X-Debug-Bypass': 'true'
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrders((data.orders || []).filter(o => isUserPurchaseHistoryOrder(o.status)));
      }
      setLoading(false);
    });
  };

  if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

  return (
    <div className="history-page animate-in p-5">
      <div className="flex items-center gap-[15px] mb-[25px]">
         <button onClick={() => setView('home')} className="back-btn-pill">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
         </button>
         <h1 className="hero-welcome m-0">ប្រវត្តិការទិញ 📜</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-[100px] px-5 bg-[var(--bg-surface)] rounded-[28px] shadow-[var(--shadow-soft)] border border-[var(--border-subtle)]">
           <div className="text-[60px] mb-5">🛍️</div>
           <h3 className="mb-2.5 text-[var(--text-bold)]">មិនទាន់មានការទិញទេ</h3>
           <p className="opacity-60 text-[13px] mb-[25px] text-[var(--text-main)]">រាល់ការកម្ម៉ង់របស់អ្នកនឹងបង្ហាញនៅទីនេះ។</p>
           <button onClick={() => setView('home')} className="shop-now-btn w-full">ទៅមើលទំនិញថ្មីៗ</button>
        </div>
      ) : (
        <div className="history-list">
          {orders.map(order => (
            <div key={order.id} className="history-card premium-card animate-in mb-[15px] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
               <div className="history-header flex justify-between items-start mb-[15px]">
                  <div>
                    <div className="text-[11px] font-bold opacity-50 mb-1 text-[var(--text-muted)]">
                        {order.order_code || order.id}
                    </div>
                    <div className="text-[13px] font-extrabold text-[var(--text-bold)]">
                        {new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
               </div>
               {/* 🚀 Modern Step-based Tracker */}
               <div className="relative my-[30px] px-[5px]">
                  <div className="absolute top-[18px] left-0 w-full h-1 bg-[var(--bg-soft)] rounded-[10px]"></div>
                  <div style={{ 
                     position: 'absolute', top: '18px', left: 0, 
                     width: `${Math.max(0, ((orderStatuses[order.status]?.step || 0) - 1) * 50)}%`, 
                     height: '4px', background: orderStatuses[order.status]?.color || '#cbd5e1', borderRadius: 10, 
                     transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }}></div>

                  <div className="flex justify-between relative z-10">
                     {[
                       { step: 1, icon: '💰', label: 'Paid' },
                       { step: 2, icon: '📦', label: 'Packing' },
                       { step: 3, icon: '✨', label: 'Shipped' }
                     ].map((s, i) => {
                        const stepNum = orderStatuses[order.status]?.step || 0;
                        const isActive = s.step <= stepNum;
                        const isCurrent = s.step === stepNum;
                        const sColor = orderStatuses[order.status]?.color || '#cbd5e1';
                        return (
                           <div key={i} className="flex flex-col items-center flex-1">
                              <div style={{ 
                                 width: 32, height: 32, borderRadius: 12, 
                                 background: isActive ? sColor : 'var(--bg-surface)', 
                                 border: isActive ? `none` : '2px solid var(--border-subtle)',
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                 boxShadow: isCurrent ? `0 0 15px ${sColor}44` : 'none',
                                 transform: isCurrent ? 'scale(1.1)' : 'none',
                                 transition: 'all 0.4s ease',
                                 position: 'relative'
                              }}>
                                 {isActive ? (isCurrent ? s.icon : '✓') : s.icon}
                                 {isCurrent && <div className="pulse-tracker" style={{ position: 'absolute', inset: -3, borderRadius: 15, border: `2px solid ${sColor}`, opacity: 0.5 }}></div>}
                              </div>
                              <div style={{ 
                                 fontSize: 7, fontWeight: 900, marginTop: 6, 
                                 color: isActive ? 'var(--text-bold)' : 'var(--text-muted)',
                                 textTransform: 'uppercase', letterSpacing: 0.5
                              }}>
                                 {s.label}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {order.tracking_number && (
                 <div className="premium-card bg-blue-500/5 border border-dashed border-blue-500/10 p-[10px] rounded-[14px] mb-[15px] flex items-center gap-[10px]">
                    <div className="text-[20px]">🚛</div>
                    <div className="flex-1">
                       <div className="text-[9px] font-extrabold text-blue-500 uppercase">Tracking ID</div>
                       <div className="flex items-center gap-1.5">
                          <div className="text-[13px] font-black text-[var(--text-bold)]">{order.tracking_number}</div>
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.tracking_number);
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                                const btn = e.currentTarget;
                                const oldHtml = btn.innerHTML;
                                btn.innerHTML = '✓';
                                setTimeout(() => btn.innerHTML = oldHtml, 2000);
                             }}
                             className="bg-transparent border-none p-0 text-[12px] cursor-pointer opacity-50"
                          >
                             📋
                          </button>
                       </div>
                    </div>
                    <button 
                       onClick={() => {
                          const tg = window.Telegram?.WebApp;
                          const url = `https://www.google.com/search?q=${order.tracking_number}`;
                          if (tg?.openLink) {
                            tg.openLink(url);
                          } else {
                            window.open(url, '_blank');
                          }
                       }}
                       className="bg-blue-500 text-white border-none px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold"
                    >
                       Track
                    </button>
                 </div>
               )}

                {order.status === 'pending' ? (
                  <div className="premium-card bg-amber-500/10 border border-dashed border-amber-500/30 px-3.5 py-2.5 rounded-[14px] mb-[15px] text-[12px] font-extrabold text-amber-500 text-center">
                    ⏳ កំពុងរង់ចាំការបញ្ជាក់ការបង់ប្រាក់ពីហាង...
                  </div>
                ) : isPaymentConfirmed(order.status) && order.receipt_url && (
                  <div className="premium-card bg-emerald-500/5 border border-dashed border-emerald-500/20 p-[10px] rounded-[14px] mb-[15px]">
                     <div className="text-[9px] font-extrabold text-emerald-500 uppercase mb-2 flex items-center gap-1">
                        <span>🧾</span> វិក្កយបត្រផ្លូវការដែលបានបញ្ជាក់ (Official Receipt)
                     </div>
                     <div className="w-full rounded-lg overflow-hidden">
                        <img src={order.receipt_url} alt="Receipt" className="w-full max-h-[150px] object-contain cursor-pointer" onClick={() => {
                           const tg = window.Telegram?.WebApp;
                           if (tg?.openLink) {
                             tg.openLink(order.receipt_url);
                           } else {
                             window.open(order.receipt_url, '_blank');
                           }
                        }} />
                     </div>
                  </div>
                )}

               <div className="history-footer flex justify-between items-center">
                  <div className="text-[11px] font-bold opacity-60 text-[var(--text-muted)]">TOTAL SPENT</div>
                  <div className="text-[18px] font-black text-[var(--text-bold)]">${parseFloat(order.total).toFixed(2)}</div>
               </div>
               <style>{`
                  @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 0.5; } 100% { transform: scale(1.2); opacity: 0; } }
                  .pulse-tracker { animation: pulse-ring 1.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite; }
               `}</style>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;
