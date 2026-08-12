import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../context/TelegramContext';
import { useUserState } from '../../context/UserContext';

const OnlineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const OfflineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const { HapticFeedback, showAlert } = useTelegram();
  const { t } = useUserState();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      HapticFeedback?.notificationOccurred('success');
      setTimeout(() => setShowRestored(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      HapticFeedback?.notificationOccurred('error');
      showAlert?.(t('offline_alert'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [HapticFeedback, showAlert, t]);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <div className="network-toast network-toast--online" role="status" aria-live="polite">
        <span className="network-toast__icon network-toast__icon--online">
          <OnlineIcon />
        </span>
        <span className="network-toast__text">{t('online_restored')}</span>
      </div>
    );
  }

  return (
    <div className="network-toast network-toast--offline" role="alert" aria-live="assertive">
      <span className="network-toast__icon network-toast__icon--offline">
        <OfflineIcon />
      </span>
      <div className="network-toast__body">
        <div className="network-toast__title">{t('offline_title')}</div>
        <div className="network-toast__hint">{t('offline_hint')}</div>
      </div>
    </div>
  );
};

export default OfflineBanner;
