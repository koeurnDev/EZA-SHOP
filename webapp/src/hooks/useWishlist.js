import { useState, useCallback, useEffect, useRef } from 'react';
import apiRequest from '../api';

const STORAGE_KEY = 'momo_wishlist';

/** Positive integer product IDs only — rejects NaN, floats, objects, stale strings */
const parseWishlistProductId = (value) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
};

const sanitizeWishlistIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(parseWishlistProductId).filter(Boolean))];
};

const readLocalWishlist = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    const sanitized = sanitizeWishlistIds(parsed);
    if (sanitized.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
      writeLocalWishlist(sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
};

const writeLocalWishlist = (ids) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeWishlistIds(ids)));
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

        const serverIds = sanitizeWishlistIds(data.wishlist);
        const localIds = readLocalWishlist();
        const merged = [...new Set([...serverIds, ...localIds])];

        setWishlist(merged);
        writeLocalWishlist(merged);

        const serverIdSet = new Set(serverIds);
        const localOnly = localIds.filter((id) => !serverIdSet.has(id));
        for (const productId of localOnly) {
          try {
            await apiRequest('/api/wishlist/toggle', {
              method: 'POST',
              body: JSON.stringify({ productId })
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
    const numericId = parseWishlistProductId(productId);
    if (numericId == null) return false;

    const prev = wishlistRef.current;
    const wasFavorited = prev.some((item) => item === numericId);
    const optimistic = wasFavorited
      ? prev.filter((item) => item !== numericId)
      : [...prev, numericId];

    setWishlist(optimistic);
    writeLocalWishlist(optimistic);

    if (!userId) {
      return !wasFavorited;
    }

    try {
      const data = await apiRequest('/api/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId: numericId })
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
