import React from 'react';
import './ShopHeader.css';
import NotificationsModal from './NotificationsModal';

import { useShopDispatch, useShopState } from '../../context/ShopContext';

const ShopHeader = ({ searchTerm, setSearchTerm, user, setView, view, lang, theme, toggleLang, toggleTheme }) => {
  const { setShowFilterModal } = useShopDispatch();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);
  const searchInputRef = React.useRef(null);

  // Search Bar & Filter are strictly hidden on 'home' view, and only shown on 'browse' view
  const isSearchVisible = view === 'browse';

  React.useEffect(() => {
    if (view === 'browse') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [view]);

  // Dynamic check for unread notifications badge
  React.useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    fetch(`${BACKEND_URL}/api/notifications`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          try {
            const cleared = JSON.parse(localStorage.getItem('momo_cleared_notifications') || '[]');
            const read = JSON.parse(localStorage.getItem('momo_read_notifications') || '[]');
            const unreadExist = (data.notifications || []).some(
              n => !cleared.includes(String(n.id)) && !read.includes(String(n.id))
            );
            setHasUnread(unreadExist);
          } catch (e) {
            setHasUnread(false);
          }
        }
      })
      .catch(() => {});
  }, [isNotificationsOpen]);

  return (
    <div className="shop-header-container">
      {/* Top Row: Back button & Profile/Toggles */}
      <div className="shop-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
        
        {/* Left Side Group (Back + Profile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {view !== 'home' ? (
            <button className="shop-back-btn" onClick={() => setView('home')} aria-label="Go back" style={{ flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          ) : null}

          {/* 👤 Ultra-Compact Profile */}
          <div className="profile-badge-luxury flex-shrink-0 cursor-pointer" onClick={() => setView('profile')} style={{ display: 'flex', alignItems: 'center', margin: 0 }}>
             <div className="avatar-mini-lux">
                {user?.photo_url ? (
                   <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                   <div className="avatar-placeholder-lux flex items-center justify-center text-xs">{user?.first_name?.charAt(0) || '👤'}</div>
                )}
             </div>
             <div className="profile-info-lux ml-2">
                <span className="user-name-lux text-[12px] font-bold">{user?.first_name || (lang === 'kh' ? 'ភ្ញៀវ' : 'Guest User')}</span>
             </div>
          </div>
        </div>

        {/* Right Side Group (Actions) */}
        <div className="hero-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
           {/* 🌐 Lang */}
           <div className="lang-switcher-pill flex items-center justify-center cursor-pointer" onClick={toggleLang} style={{ height: '36px', padding: '0 8px', gap: '4px', margin: 0 }}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" style={{ width: '16px', height: '16px' }} />
              <span className="text-[10px] font-black">{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>

           {/* 🌓 Theme Toggle */}
           <div className="theme-toggle-pill flex items-center justify-center cursor-pointer" onClick={toggleTheme} style={{ width: '36px', height: '36px', padding: 0, margin: 0 }}>
              <span style={{ fontSize: '14px' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
           </div>

           {/* 🔔 Notifications */}
           <div className="theme-toggle-pill flex items-center justify-center cursor-pointer relative" onClick={() => setIsNotificationsOpen(true)} style={{ width: '36px', height: '36px', padding: 0, margin: 0 }}>
              <span style={{ fontSize: '14px' }}>🔔</span>
              {hasUnread && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', background: '#ff3b30', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}></span>
              )}
           </div>
        </div>
      </div>

      {/* Search Row: Strictly hidden on 'home' view, visible ONLY on 'browse' view */}
      {isSearchVisible && (
        <>
          <div className="shop-header-divider" style={{ margin: '10px -20px 10px -20px' }}></div>

          {/* Bottom Row: Search & Actions */}
          <div className="shop-search-area animate-in">
            <div className="shop-search-bar">
              <div className="shop-search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={lang === 'kh' ? 'ស្វែងរកទំនិញ...' : 'Search products...'} 
                className="shop-search-input"
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
              />
            </div>

            <div className="shop-action-icons">
              {/* Filter Sliders Icon */}
              <button className="shop-action-btn" aria-label="Filter Results" onClick={() => setShowFilterModal(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} lang={lang} />
    </div>
  );
};

export default ShopHeader;
