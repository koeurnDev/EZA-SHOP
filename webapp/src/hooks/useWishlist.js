import { useState, useCallback, useEffect, useRef } from 'react';
import apiRequest from '../api';

const STORAGE_KEY = 'momo_wishlist';

const readLocalWishlist = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalWishlist = (ids) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
};

export function useWishlist(userId) {
  const [wishlist, setWishlist] = useState(readLocalWishlist);
  const [loading, setLoading] = useState(false);
  const wishlistRef = useRef(wishlist);
  wishlistRef.current = wishlist;

  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await apiRequest('/api/wishlist');
        if (cancelled || !data?.success) return;

        const serverIds = Array.isArray(data.wishlist) ? data.wishlist : [];
        const localIds = readLocalWishlist();
        const merged = [...new Set([...serverIds, ...localIds].map(String))];

        setWishlist(merged);
        writeLocalWishlist(merged);

        const localOnly = localIds.filter(
          (id) => !serverIds.some((sid) => String(sid) === String(id))
        );
        for (const id of localOnly) {
          try {
            await apiRequest('/api/wishlist/toggle', {
              method: 'POST',
              body: JSON.stringify({ productId: Number(id) })
            });
          } catch {
            /* best-effort one-time sync */
          }
        }
      } catch {
        /* keep local cache when offline or unauthenticated */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const isFavorited = useCallback(
    (productId) => wishlist.some((id) => String(id) === String(productId)),
    [wishlist]
  );

  const toggleWishlist = useCallback(async (productId) => {
    if (productId == null) return false;

    const id = String(productId);
    const prev = wishlistRef.current;
    const wasFavorited = prev.some((item) => String(item) === id);
    const optimistic = wasFavorited
      ? prev.filter((item) => String(item) !== id)
      : [...prev, productId];

    setWishlist(optimistic);
    writeLocalWishlist(optimistic);

    if (!userId) {
      return !wasFavorited;
    }

    try {
      const data = await apiRequest('/api/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId: Number(productId) })
      });

      if (data?.success) {
        return Boolean(data.added);
      }
    } catch {
      setWishlist(prev);
      writeLocalWishlist(prev);
    }

    return wasFavorited ? false : true;
  }, [userId]);

  return {
    wishlist,
    wishlistCount: wishlist.length,
    isFavorited,
    toggleWishlist,
    wishlistLoading: loading
  };
}
