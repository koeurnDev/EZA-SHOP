import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTelegram } from './TelegramContext';
import { useUser } from './UserContext';
import { useShopState, useShopDispatch } from './ShopContext';
import OfflineService from '../services/OfflineService';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { tg, HapticFeedback } = useTelegram();
  const { lang, user } = useUser();
  const shopState = useShopState();
  const shopDispatch = useShopDispatch();
  const shopStatus = shopState?.shopStatus ?? 'open';
  const showToast = shopDispatch?.showToast;
  
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('momo_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Persistent Idempotency Key (Survives refresh/crash during checkout)
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    return localStorage.getItem('momo_idemp_key') || null;
  });

  const [flyingItems, setFlyingItems] = useState([]);
  const cartIconRef = useRef(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('momo_cart_v1', JSON.stringify(cart));
    
    // ☁️ Sync to Telegram Cloud Storage (Cross-device persistence)
    if (tg?.CloudStorage && tg?.isVersionAtLeast?.('6.9')) {
      try {
        tg.CloudStorage.setItem('momo_cart_v1', JSON.stringify(cart));
      } catch (e) {
        console.warn('CloudStorage setItem failed:', e);
      }
    }
    
    // 🛡️ Fix: idempotencyKey removed from deps — it was causing an infinite loop
    // (effect reads key → mutates key → triggers re-run). Cart change alone is
    // sufficient to invalidate the key for a new checkout attempt.
    localStorage.removeItem('momo_idemp_key');
    setIdempotencyKey(null);
  }, [cart, tg]); // ✅ idempotencyKey intentionally excluded from deps

  // ☁️ Initial Sync from Telegram Cloud Storage on Mount
  useEffect(() => {
    if (tg?.CloudStorage && tg?.isVersionAtLeast?.('6.9')) {
      try {
        tg.CloudStorage.getItem('momo_cart_v1', (err, value) => {
          if (!err && value) {
            const cloudCart = JSON.parse(value);
            if (Array.isArray(cloudCart)) {
              setCart(cloudCart); // Overwrite local storage with cloud truth
            }
          }
        });
      } catch (e) {
        console.warn('CloudStorage getItem failed:', e);
      }
    }
  }, [tg]);

  useEffect(() => {
    if (idempotencyKey) localStorage.setItem('momo_idemp_key', idempotencyKey);
    else localStorage.removeItem('momo_idemp_key');
  }, [idempotencyKey]);

  const addToCart = useCallback((product, e, variant = null) => {
    if (shopStatus === 'closed') return;

    if (e && cartIconRef.current) {
      const rect = cartIconRef.current.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;
      setFlyingItems(prev => [...prev, {
        id: Date.now(),
        startX: e.clientX,
        startY: e.clientY,
        endX: targetX,
        endY: targetY
      }]);
      setTimeout(() => setFlyingItems(prev => prev.slice(1)), 1000);
    }

    HapticFeedback?.impactOccurred('light');

    if (showToast) {
       showToast(lang === 'kh' ? `បានបន្ថែម ${product.name} ចូលកន្ត្រក` : `Added ${product.name} to cart`);
    }

    setCart(prev => {
      const cartKey = variant ? `${product.id}_${variant.color||''}_${variant.size||''}` : product.id;
      const existing = prev.find(item => item.cartKey === cartKey || (!item.cartKey && item.id === product.id && !variant));
      
      if (existing) {
        return prev.map(item => (item.cartKey === cartKey || (!item.cartKey && item.id === product.id && !variant)) 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, {
        ...product,
        cartKey,
        variant,
        quantity: 1,
        ...(variant ? {
          selectedSize: variant.size || '',
          selectedColor: variant.color || ''
        } : {})
      }];
    });
  }, [shopStatus, tg, lang, showToast, HapticFeedback]);

  const updateQty = useCallback((cartKeyOrId, delta) => {
    setCart(prev => {
      const updated = prev.map(item => {
        const isMatch = item.cartKey ? item.cartKey === cartKeyOrId : item.id === cartKeyOrId;
        return isMatch ? { ...item, quantity: Math.min(item.quantity + delta, 100) } : item;
      });
      return updated.filter(item => item.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem('momo_idemp_key');
    localStorage.setItem('momo_cart_v1', JSON.stringify([]));
    setIdempotencyKey(null);
    if (tg?.CloudStorage && tg?.isVersionAtLeast?.('6.9')) {
      try {
        tg.CloudStorage.setItem('momo_cart_v1', JSON.stringify([]));
      } catch (e) {
        console.warn('CloudStorage clear cart failed:', e);
      }
    }
  }, [tg]);

  const prepareIdempotency = useCallback(() => {
    const key = Math.random().toString(36).substring(2) + Date.now();
    setIdempotencyKey(key);
    return key;
  }, []);

  const cartInfo = useMemo(() => ({
    cart,
    totalPrice: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    totalItemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    flyingItems,
    cartIconRef,
    idempotencyKey
  }), [cart, flyingItems, idempotencyKey]);

  const dispatch = useMemo(() => ({
    addToCart,
    updateQty,
    clearCart,
    prepareIdempotency
  }), [addToCart, updateQty, clearCart, prepareIdempotency]);

  return (
    <CartStateContext.Provider value={cartInfo}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
};

export const useCart = () => {
  const state = useContext(CartStateContext);
  const dispatch = useContext(CartDispatchContext);
  if (!state || !dispatch) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return { ...state, ...dispatch };
};

export const useCartState = () => useContext(CartStateContext);
export const useCartDispatch = () => useContext(CartDispatchContext);
