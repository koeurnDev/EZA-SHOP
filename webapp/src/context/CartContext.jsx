import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTelegram } from './TelegramContext';
import { useUserState } from './UserContext';
import { useShopState, useShopDispatch } from './ShopContext';
import OfflineService from '../services/OfflineService';
import { isKnownBrokenImage } from '../utils/imageUtils';

const CartStateContext = createContext(null);
const CartDispatchContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { tg, HapticFeedback } = useTelegram();
  const userState = useUserState();
  const lang = userState?.lang ?? localStorage.getItem('momo_lang') ?? 'kh';
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

    // 🔄 Sync Cart to Backend for Abandoned Cart Recovery
    const tgInitData = window.Telegram?.WebApp?.initData;
    if (tgInitData) {
      // Debounce the fetch call slightly to avoid spamming the backend when rapidly changing qty
      const timeoutId = setTimeout(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/cart`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-TG-Data': tgInitData
          },
          body: JSON.stringify({ cart })
        }).catch(err => console.warn('Failed to sync cart to backend:', err));
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
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

  // Drop stale Cloudinary URLs from cart (deleted products / removed images)
  useEffect(() => {
    const products = shopState?.products;
    if (!Array.isArray(products)) return;
    const byId = new Map(products.map((p) => [String(p.id), p]));

    setCart((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const live = byId.get(String(item.id));
        if (live) {
          const image = live.image || '';
          if (image !== (item.image || '') || live.price !== item.price || live.name !== item.name) {
            changed = true;
            return { ...item, image, price: live.price, name: live.name, stock: live.stock };
          }
          return item;
        }
        if (item.image && isKnownBrokenImage(item.image)) {
          changed = true;
          return { ...item, image: '' };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [shopState?.products]);

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
