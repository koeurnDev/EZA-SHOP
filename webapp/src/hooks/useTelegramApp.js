import { useEffect } from 'react';

export function useTelegramApp(tg, view, setView, isVersionAtLeast, cartLength) {
  // Navigation & BackButton Logic
  useEffect(() => {
    if (!tg) return;
    const handleBack = () => {
      if (view === 'product_detail') setView('browse');
      else if (view === 'wishlist') setView('profile');
      else setView('home');
    };

    if ((view === 'checkout' || view === 'browse' || view === 'product_detail' || view === 'wishlist') && isVersionAtLeast('6.1')) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
      return () => tg.BackButton.offClick(handleBack);
    } else if (isVersionAtLeast('6.1')) {
      tg.BackButton.hide();
    }
  }, [view, tg, setView, isVersionAtLeast]);

  // Prevent accidental closing if cart has items
  useEffect(() => {
    if (!tg || !isVersionAtLeast('6.2')) return;
    if (cartLength > 0) {
      tg.enableClosingConfirmation();
    } else {
      tg.disableClosingConfirmation();
    }
  }, [cartLength, tg, isVersionAtLeast]);
}
