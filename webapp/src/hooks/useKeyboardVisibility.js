import { useState, useEffect } from 'react';
import { useTelegram } from '../context/TelegramContext';

export const useKeyboardVisibility = () => {
  const { tg } = useTelegram();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    let timeoutId;
    let fallbackTimeoutId;

    const handleViewportChanged = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setKeyboardVisible(tg.viewportHeight < window.innerHeight * 0.8);
      }, 100);
    };

    const handleResize = () => {
      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = setTimeout(() => {
        setKeyboardVisible(window.visualViewport.height < window.innerHeight * 0.8);
      }, 100);
    };

    // 📱 Telegram-specific viewport handling
    if (tg) {
      tg.onEvent('viewportChanged', handleViewportChanged);
    }

    // 🌐 Regular browser fallback (Visual Viewport API)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimeoutId);
      if (tg) tg.offEvent('viewportChanged', handleViewportChanged);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleResize);
    };
  }, [tg]);

  return isKeyboardVisible;
};
