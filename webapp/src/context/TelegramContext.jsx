import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const TelegramContext = createContext(null);

export const TelegramProvider = ({ children }) => {
  const [tg, setTg] = useState(null);

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      webapp.expand();
      setTg(webapp);
    }
  }, []);

  const [confirmData, setConfirmData] = useState({ show: false, message: '', callback: null });
  const [alertData, setAlertData] = useState({ show: false, message: '' });

  const value = useMemo(() => {
    const safeHapticFeedback = tg ? {
      impactOccurred: (style) => {
        try { if (tg.isVersionAtLeast?.('6.1')) tg.HapticFeedback.impactOccurred(style); } catch(e){}
      },
      notificationOccurred: (type) => {
        try { if (tg.isVersionAtLeast?.('6.1')) tg.HapticFeedback.notificationOccurred(type); } catch(e){}
      },
      selectionChanged: () => {
        try { if (tg.isVersionAtLeast?.('6.1')) tg.HapticFeedback.selectionChanged(); } catch(e){}
      }
    } : null;

    const safeShowPopup = (params, callback) => {
      try {
        if (tg?.isVersionAtLeast?.('6.2')) {
          tg.showPopup(params, callback);
        } else {
          setAlertData({ show: true, message: params.message });
        }
      } catch(e) {
        setAlertData({ show: true, message: params.message });
      }
    };

    const safeShowAlert = (message, callback) => {
      try {
        if (tg?.isVersionAtLeast?.('6.2')) { tg.showAlert(message, callback); } else { setAlertData({ show: true, message }); }
      } catch(e) { setAlertData({ show: true, message }); }
    };

    const safeShowConfirm = (message, callback) => {
      try {
        if (tg?.isVersionAtLeast?.('6.2')) { tg.showConfirm(message, callback); } else { setConfirmData({ show: true, message, callback }); }
      } catch(e) { setConfirmData({ show: true, message, callback }); }
    };

    const safeSwitchInlineQuery = (query, chat_types = []) => {
      try {
        if (tg?.isVersionAtLeast?.('6.7')) {
          tg.switchInlineQuery(query, chat_types);
        } else {
          setAlertData({ show: true, message: query + "\n\n(Share feature requires a newer Telegram version)" });
        }
      } catch(e) {
        setAlertData({ show: true, message: query + "\n\n(Share feature requires a newer Telegram version)" });
      }
    };

    return {
      tg: tg,
      user: tg?.initDataUnsafe?.user,
      initData: tg?.initData,
      isExpanded: tg?.isExpanded,
      colorScheme: tg?.colorScheme,
      version: tg?.version,
      headerColor: tg?.headerColor,
      backgroundColor: tg?.backgroundColor,
      BackButton: tg?.BackButton,
      MainButton: tg?.MainButton,
      HapticFeedback: safeHapticFeedback,
      showPopup: safeShowPopup,
      showAlert: safeShowAlert,
      showConfirm: safeShowConfirm,
      switchInlineQuery: safeSwitchInlineQuery,
      sendData: tg?.sendData,
      close: tg?.close,
      setHeaderColor: (color) => { try { tg?.setHeaderColor?.(color); } catch(e){} },
      setBackgroundColor: (color) => { try { tg?.setBackgroundColor?.(color); } catch(e){} },
      isVersionAtLeast: (version) => { try { return tg?.isVersionAtLeast?.(version) || false; } catch(e){ return false; } },
    };
  }, [tg]);

  return (
    <TelegramContext.Provider value={value}>
      {children}
      
      {/* Custom Confirm Fallback */}
      {confirmData.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div className="animate-in" style={{ background: 'var(--bg-surface, #1e1e24)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.18))', padding: '28px 24px', borderRadius: '24px', width: '90%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>❓</div>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: 'var(--text-bold, #ffffff)', fontWeight: '700', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{confirmData.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setConfirmData({ show: false }); if(confirmData.callback) confirmData.callback(false); }} 
                style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-soft, rgba(255,255,255,0.08))', color: 'var(--text-bold, #ffffff)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', borderRadius: '14px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                បោះបង់
              </button>
              <button 
                onClick={() => { setConfirmData({ show: false }); if(confirmData.callback) confirmData.callback(true); }} 
                style={{ flex: 1.2, padding: '12px 16px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s ease' }}
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Fallback */}
      {alertData.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: '20px' }}>
          <div className="animate-in" style={{ background: 'var(--bg-surface, #1e1e24)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.18))', padding: '28px 24px', borderRadius: '24px', width: '90%', maxWidth: '340px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '36px', marginBottom: '14px' }}>✨</div>
            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: 'var(--text-bold, #ffffff)', fontWeight: '700', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{alertData.message}</p>
            <button 
              onClick={() => setAlertData({ show: false })} 
              style={{ width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s ease' }}
            >
              យល់ព្រម
            </button>
          </div>
        </div>
      )}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};
