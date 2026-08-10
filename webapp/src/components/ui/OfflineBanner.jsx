import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../context/TelegramContext';

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const { tg } = useTelegram();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      setTimeout(() => setShowRestored(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      if (tg?.showAlert) {
        try {
          tg.showAlert('⚠️ គ្មានការតភ្ជាប់អ៊ីនធឺណិតទេ!\nសូមពិនិត្យមើល Wi-Fi ឬ Mobile Data របស់អ្នក។');
        } catch (e) {}
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tg]);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 800,
        animation: 'toast-in 0.3s ease forwards'
      }}>
        <span>🌐</span>
        <span>ភ្ជាប់អ៊ីនធឺណិតវិញហើយ (Internet Restored)</span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: 420,
      zIndex: 99999,
      background: 'rgba(239, 68, 68, 0.95)',
      backdropFilter: 'blur(10px)',
      color: '#ffffff',
      padding: '14px 20px',
      borderRadius: '20px',
      boxShadow: '0 12px 35px rgba(239, 68, 68, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      animation: 'toast-in 0.3s ease forwards'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 0 10px #ffffff'
        }}></div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.5 }}>
            ⚠️ គ្មានការតភ្ជាប់អ៊ីនធឺណិត (Offline)
          </div>
          <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 700 }}>
            សូមពិនិត្យមើល Wi-Fi ឬ Mobile Data (4G/5G) របស់អ្នក
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
