import React from 'react';
import './ShopHeader.css';
import NotificationsModal from './NotificationsModal';

import { useShopDispatch, useShopState } from '../../context/ShopContext';

const ShopHeader = ({ searchTerm, setSearchTerm, user, setView, view, lang, theme, toggleLang, toggleTheme }) => {
  const { setShowFilterModal, setShowScanner } = useShopDispatch();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  return (
    <div className="shop-header-container">
      {/* Top Row: Back button & Profile/Toggles */}
      <div className="shop-header-top" style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        {view !== 'home' ? (
          <button className="shop-back-btn" onClick={() => setView('home')} aria-label="Go back" style={{ marginRight: '10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        ) : null}

        {/* 👤 Ultra-Compact Profile (Left) */}
        <div className="profile-badge-luxury flex-shrink-0 cursor-pointer" onClick={() => setView('profile')} style={{ display: 'flex', alignItems: 'center' }}>
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

        {/* 📱 Single Actions Row (Right) */}
        <div className="hero-actions-right flex flex-1 justify-end gap-1.5" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
           {/* 🌐 Lang */}
           <div className="lang-switcher-pill flex items-center px-2 h-9 gap-1 cursor-pointer" onClick={toggleLang}>
              <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" className="w-4 h-4" />
              <span className="text-[10px] font-black" style={{ marginLeft: '4px' }}>{lang === 'kh' ? 'KH' : 'EN'}</span>
           </div>

           {/* 🌓 Theme Toggle (Compact) */}
           <div className="theme-toggle-pill flex items-center justify-center w-9 h-9 text-sm cursor-pointer" onClick={toggleTheme} style={{ marginLeft: '6px' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
           </div>

           {/* 🔔 Notifications */}
           <div className="theme-toggle-pill flex items-center justify-center w-9 h-9 text-sm cursor-pointer relative" onClick={() => setIsNotificationsOpen(true)} style={{ marginLeft: '6px' }}>
              🔔
              <span style={{ position: 'absolute', top: '0px', right: '0px', background: '#ff3b30', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--bg-surface)' }}></span>
           </div>
        </div>
      </div>

      <div className="shop-header-divider"></div>

      {/* Bottom Row: Search & Actions */}
      <div className="shop-search-area">
        <div className="shop-search-bar">
          <div className="shop-search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder={lang === 'kh' ? 'ស្វែងរកទំនិញ...' : 'Search products...'} 
            className="shop-search-input"
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
            onFocus={() => view === 'home' && setView('browse')}
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

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
};

export default ShopHeader;
