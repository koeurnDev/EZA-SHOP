import React, { useState, useEffect, useRef } from 'react';

/**
 * 🐉 Taobao / Shein / Douyin Style Minimalist Image Viewer
 * Features:
 * - Ultra-clean, zero clutter (No desktop buttons)
 * - Double-Tap to Zoom (1x <-> 2.5x)
 * - Pinch-to-Zoom (1x to 4x) & Pan when zoomed
 * - Swipe Left/Right to change image
 * - Drag-Down to Dismiss (Pull to close like Taobao/WeChat)
 * - Subtle bottom dot indicators & top page counter
 */
const ImageLightboxModal = ({ images = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dismissOffset, setDismissOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const touchStartRef = useRef({ x: 0, y: 0, time: 0, dist: 0 });
  const lastTapRef = useRef(0);
  const currentImg = images[currentIndex] || '';

  const triggerHaptic = (type = 'light') => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      try { tg.HapticFeedback.impactOccurred(type); } catch (e) {}
    }
  };

  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setDismissOffset(0);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    resetTransform();
    setCurrentIndex(prev => (prev + 1) % images.length);
    triggerHaptic('light');
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    resetTransform();
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    triggerHaptic('light');
  };

  // Keyboard support for desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  // Touch Gesture handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      
      // Double tap detection (Taobao style)
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          resetTransform();
        } else {
          setScale(2.5);
          triggerHaptic('medium');
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now, dist: 0 };
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dy = touch.clientY - touchStartRef.current.y;
      const dx = touch.clientX - touchStartRef.current.x;

      if (scale > 1 && isDragging) {
        // Pan image when zoomed
        setPosition({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y
        });
      } else if (scale === 1 && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
        // Taobao Pull-Down to dismiss gesture
        setDismissOffset(dy);
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      setScale(prev => Math.min(Math.max(prev * factor, 1), 4));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);

    // Pull-down dismiss threshold
    if (scale === 1 && dismissOffset > 100) {
      onClose();
      return;
    } else {
      setDismissOffset(0);
    }

    // Horizontal Swipe Gallery navigation
    if (scale === 1 && touchStartRef.current.time > 0 && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (Math.abs(dx) > 40 && Math.abs(dy) < 50) {
        if (dx < 0) handleNext();
        else handlePrev();
      }
    }
    touchStartRef.current = { x: 0, y: 0, time: 0, dist: 0 };
  };

  const highResUrl = currentImg.includes('cloudinary')
    ? currentImg.replace('upload/', 'upload/f_auto,q_auto:best/')
    : currentImg;

  const bgOpacity = Math.max(0.3, 1 - dismissOffset / 300);
  const dismissScale = Math.max(0.7, 1 - dismissOffset / 1000);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
        backdropFilter: 'blur(16px)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        touchAction: 'none',
        transition: dismissOffset === 0 ? 'background-color 0.2s ease' : 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClose}
    >
      {/* Top Header Bar (Close button) */}
      <div
        style={{
          padding: 'calc(env(safe-area-inset-top, 16px) + 12px) 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 10,
          opacity: dismissOffset > 0 ? 0 : 1,
          transition: 'opacity 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Image Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <img
          src={highResUrl}
          alt={`Product image ${currentIndex + 1}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate(${position.x}px, ${position.y + dismissOffset}px) scale(${scale * dismissScale})`,
            transition: isDragging || dismissOffset > 0 ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            cursor: scale > 1 ? 'grab' : 'pointer'
          }}
          crossOrigin="anonymous"
        />

        {/* Taobao Style Counter Badge (Bottom Right over Image) */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 20,
            background: 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            padding: '4px 12px',
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 800,
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            pointerEvents: 'none'
          }}>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Selector Row (Taobao Style) */}
      {images.length > 1 && (
        <div
          style={{
            padding: '12px 16px calc(env(safe-area-inset-bottom, 16px) + 16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            zIndex: 10,
            opacity: dismissOffset > 0 ? 0 : 1,
            transition: 'opacity 0.2s ease'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt=""
              onClick={() => {
                setCurrentIndex(idx);
                resetTransform();
                triggerHaptic('light');
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                objectFit: 'cover',
                cursor: 'pointer',
                border: currentIndex === idx ? '2px solid #ffffff' : '2px solid transparent',
                opacity: currentIndex === idx ? 1 : 0.45,
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              crossOrigin="anonymous"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightboxModal;
