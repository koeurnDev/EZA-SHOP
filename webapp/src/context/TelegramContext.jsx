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
        <div className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center backdrop-blur-md p-5">
          <div className="animate-in bg-[var(--bg-surface,#1e1e24)] border border-[var(--border-subtle,rgba(255,255,255,0.18))] py-7 px-6 rounded-[24px] w-[90%] max-w-[340px] text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="text-[36px] mb-3.5">❓</div>
            <p className="m-0 mb-6 text-[15px] text-[var(--text-bold,#ffffff)] font-bold leading-relaxed whitespace-pre-line">{confirmData.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setConfirmData({ show: false }); if(confirmData.callback) confirmData.callback(false); }} 
                className="flex-1 px-4 py-3 bg-[var(--bg-soft,rgba(255,255,255,0.08))] text-[var(--text-bold,#ffffff)] border border-[var(--border-subtle,rgba(255,255,255,0.15))] rounded-xl font-extrabold text-[14px] cursor-pointer transition-all duration-200 ease-in-out"
              >
                បោះបង់
              </button>
              <button 
                onClick={() => { setConfirmData({ show: false }); if(confirmData.callback) confirmData.callback(true); }} 
                className="flex-[1.2] px-4 py-3 bg-gradient-to-br from-red-500 to-red-600 text-white border-none rounded-xl font-black text-[14px] cursor-pointer shadow-[0_4px_14px_rgba(239,68,68,0.3)] transition-all duration-200 ease-in-out"
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Fallback */}
      {alertData.show && (
        <div className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center backdrop-blur-md p-5">
          <div className="animate-in bg-[var(--bg-surface,#1e1e24)] border border-[var(--border-subtle,rgba(255,255,255,0.18))] py-7 px-6 rounded-[24px] w-[90%] max-w-[340px] text-center shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="text-[36px] mb-3.5">✨</div>
            <p className="m-0 mb-6 text-[15px] text-[var(--text-bold,#ffffff)] font-bold leading-relaxed whitespace-pre-line">{alertData.message}</p>
            <button 
              onClick={() => setAlertData({ show: false })} 
              className="w-full px-4 py-3 bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none rounded-xl font-black text-[14px] cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.3)] transition-all duration-200 ease-in-out"
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
