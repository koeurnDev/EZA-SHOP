import { useState, useEffect } from 'react';
import { useTelegram } from '../context/TelegramContext';

export const useKeyboardVisibility = () => {
  const { tg } = useTelegram();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // 📱 Telegram-specific viewport handling
    if (tg) {
      let timeoutId;
      const handleViewportChanged = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (tg.viewportHeight < window.innerHeight * 0.8) {
            setKeyboardVisible(true);
          } else {
            setKeyboardVisible(false);
          }
        }, 100);
      };

      tg.onEvent('viewportChanged', handleViewportChanged);
      return () => {
        clearTimeout(timeoutId);
        tg.offEvent('viewportChanged', handleViewportChanged);
      };
    }

    // 🌐 Regular browser fallback (Visual Viewport API)
    if (window.visualViewport) {
      let fallbackTimeoutId;
      const handleResize = () => {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = setTimeout(() => {
          setKeyboardVisible(window.visualViewport.height < window.innerHeight * 0.8);
        }, 100);
      };
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        clearTimeout(fallbackTimeoutId);
        window.visualViewport.removeEventListener('resize', handleResize);
      };
    }
  }, [tg]);

  return isKeyboardVisible;
};
