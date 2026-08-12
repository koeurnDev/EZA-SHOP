import { useEffect, useRef, useState } from 'react';

const IDLE_MS = 450;

/**
 * Hide a fixed bar on scroll down; show on scroll up or when scrolling stops.
 * Works with window scroll or a custom scroll container ref.
 */
export default function useScrollHideBar({ enabled = true, scrollRef = null, resetKey = null } = {}) {
  const [visible, setVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return undefined;
    }

    setVisible(true);

    const getScrollEl = () => {
      if (scrollRef) return scrollRef.current || null;
      return window;
    };
    const getScrollTop = (el) => {
      if (el === window) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return el.scrollTop || 0;
    };
    const isNearBottom = (el, st) => {
      if (el === window) {
        const doc = document.documentElement;
        return st + window.innerHeight >= doc.scrollHeight - 72;
      }
      return st + el.clientHeight >= el.scrollHeight - 72;
    };

    let idleTimer = null;
    let rafId = null;
    let scrollTarget = null;

    const onScroll = () => {
      const target = getScrollEl();
      if (!target) return;

      const st = getScrollTop(target);
      const delta = st - lastScrollTopRef.current;

      clearTimeout(idleTimer);

      if (st <= 32 || isNearBottom(target, st)) {
        setVisible(true);
      } else if (delta > 4) {
        setVisible(false);
      } else if (delta < -4) {
        setVisible(true);
      }

      lastScrollTopRef.current = st;

      idleTimer = setTimeout(() => {
        setVisible(true);
      }, IDLE_MS);
    };

    const attach = () => {
      const el = getScrollEl();
      if (!el) {
        rafId = requestAnimationFrame(attach);
        return;
      }

      lastScrollTopRef.current = getScrollTop(el);
      scrollTarget = el === window ? window : el;
      scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    };

    attach();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(idleTimer);
      if (scrollTarget) scrollTarget.removeEventListener('scroll', onScroll);
    };
  }, [enabled, scrollRef, resetKey]);

  return visible;
}
