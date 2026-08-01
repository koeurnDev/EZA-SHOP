import React, { useRef, useEffect, useState } from 'react';

const VideoFeed = ({ products, onProductSelect, onAddToCart }) => {
  const [playingIndex, setPlayingIndex] = useState(0);
  const containerRef = useRef(null);
  
  const videoProducts = (products || []).filter(p => p.video_url);

  // Intersection Observer to play/pause videos based on visibility
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.getAttribute('data-index'));
          setPlayingIndex(idx);
          const video = entry.target.querySelector('video');
          if (video) video.play().catch(e => console.log('Autoplay blocked:', e));
        } else {
          const video = entry.target.querySelector('video');
          if (video) video.pause();
        }
      });
    }, {
      root: containerRef.current,
      threshold: 0.6 // Video must be 60% visible to trigger
    });

    const slides = document.querySelectorAll('.video-slide');
    slides.forEach(slide => observer.observe(slide));

    return () => {
      slides.forEach(slide => observer.unobserve(slide));
    };
  }, [videoProducts]);

  if (videoProducts.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
        <p>មិនទាន់មានវីដេអូទេ (No Videos Yet)</p>
      </div>
    );
  }

  return (
    <div 
      className="video-feed-container" 
      ref={containerRef}
      style={{
        height: '100%', 
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        background: '#000',
        position: 'relative',
        scrollBehavior: 'smooth'
      }}
    >
      {videoProducts.map((p, index) => (
        <div 
          key={p.id} 
          className="video-slide" 
          data-index={index}
          style={{
            height: '100%',
            width: '100%',
            scrollSnapAlign: 'start',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111'
          }}
        >
          {/* Video Player */}
          <video
            src={p.video_url}
            loop
            muted={false}
            playsInline
            onClick={(e) => {
              if (e.target.paused) e.target.play();
              else e.target.pause();
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />

          {/* Right Side Actions */}
          <div style={{
            position: 'absolute',
            right: '16px',
            bottom: '120px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            alignItems: 'center',
            zIndex: 10
          }}>
            <button 
              className="glass-btn-circle" 
              onClick={(e) => { e.stopPropagation(); onProductSelect(p); }}
              style={{
                width: 50, height: 50, borderRadius: 25, 
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.4)', color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                padding: 0
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <div style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginTop: '-18px' }}>មើល</div>

            <button 
              className="glass-btn-circle" 
              onClick={(e) => { e.stopPropagation(); onAddToCart(p, e); }}
              style={{
                width: 50, height: 50, borderRadius: 25, 
                background: 'var(--luxury-gold, #cfa870)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', color: 'white',
                boxShadow: '0 4px 16px rgba(207, 168, 112, 0.4)',
                padding: 0
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </button>
            <div style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginTop: '-18px' }}>ទិញ</div>
          </div>

          {/* Bottom Info Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            right: '80px',
            zIndex: 10,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)'
          }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 900, margin: '0 0 4px 0' }}>{p.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
               <span style={{ 
                 background: 'var(--luxury-gold, #cfa870)', 
                 color: 'white', padding: '2px 8px', borderRadius: '4px', 
                 fontSize: '14px', fontWeight: 'bold',
                 textShadow: 'none'
               }}>
                 ${p.flash_sale_price || p.price}
               </span>
               {p.flash_sale_price && (
                 <span style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through', fontSize: '13px' }}>
                   ${p.price}
                 </span>
               )}
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', margin: 0, 
               display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {p.description || 'ទំនិញថ្មីគុណភាពខ្ពស់ ផ្តល់ជូនបទពិសោធន៍ដ៏ល្អឥតខ្ចោះ។'}
            </p>
          </div>
          
          {/* Gradient overlay for text legibility */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)'
          }} />
        </div>
      ))}
    </div>
  );
};

export default VideoFeed;
