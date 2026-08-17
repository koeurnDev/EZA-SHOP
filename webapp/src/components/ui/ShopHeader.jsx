import React from 'react';
import './ShopHeader.css';
import NotificationsModal from './NotificationsModal';
import { useShopDispatch, useShopState } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  getSearchSuggestions
} from '../../utils/searchUtils';
import { getOptimizedThumbUrl, reportBrokenImageUrl, isKnownBrokenImage } from '../../utils/imageUtils';

const SearchProductThumb = ({ image, name }) => {
  const [failed, setFailed] = React.useState(() => isKnownBrokenImage(image));
  const src = image && !failed ? getOptimizedThumbUrl(image, 80) : '';
  const initial = name ? name.charAt(0).toUpperCase() : '📦';

  if (!src || failed) {
    return <span className="shop-search-dropdown-thumb">{initial}</span>;
  }

  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => {
        reportBrokenImageUrl(image);
        setFailed(true);
      }}
    />
  );
};

const ShopHeader = ({
  searchTerm, setSearchTerm, user, setView, view, lang, theme, toggleLang, toggleTheme,
  isKeyboardVisible = false, t
}) => {
  const { setShowFilterModal, setSearchFocused } = useShopDispatch();
  const { products, searchFocused, filters } = useShopState();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState([]);
  const searchInputRef = React.useRef(null);
  const searchAreaRef = React.useRef(null);

  const isSearchVisible = view === 'browse' || view === 'home';
  const showDropdown = isSearchVisible && searchFocused;
  const trimmed = (searchTerm || '').trim();
  const hasActiveFilters = Boolean(filters?.minPrice || filters?.maxPrice || (filters?.sort && filters.sort !== 'newest'));

  const liveSuggestions = React.useMemo(() => {
    if (!trimmed) return [];
    return getSearchSuggestions(products, trimmed, 5);
  }, [products, trimmed]);

  React.useEffect(() => {
    if (view === 'browse' || view === 'home') {
      // Don't auto-focus on home to prevent keyboard popping up immediately, only on browse if needed
      if (view === 'browse') {
        setTimeout(() => searchInputRef.current?.focus(), 120);
      }
    }
  }, [view]);

  React.useEffect(() => {
    if (searchFocused) setRecentSearches(getRecentSearches());
  }, [searchFocused]);

  React.useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

    const syncUnread = () => {
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
            } catch {
              setHasUnread(false);
            }
          }
        })
        .catch(() => {});
    };

    syncUnread();
    const timer = setInterval(syncUnread, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') syncUnread(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isNotificationsOpen]);

  React.useEffect(() => {
    const handlePointerDown = (e) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const applySearch = (term) => {
    setSearchTerm?.(term);
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
    searchInputRef.current?.blur();
    setSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchTerm?.('');
    searchInputRef.current?.focus();
  };

  const commitSearch = () => {
    if (trimmed.length >= 2) addRecentSearch(trimmed);
    searchInputRef.current?.blur();
    setSearchFocused(false);
  };

  return (
    <div className={`shop-header-container${isSearchVisible && isKeyboardVisible ? ' shop-header--sticky' : ''}`}>
      <div className="shop-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {view !== 'home' && view !== 'browse' ? (
            <button className="shop-back-btn" onClick={() => setView('home')} aria-label="Go back" style={{ flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          ) : null}

          <div className="profile-badge-luxury flex-shrink-0 cursor-pointer" onClick={() => setView('profile')} style={{ padding: '6px 12px 6px 6px' }}>
            <div className="avatar-mini-lux" style={{ background: user?.photo_url ? 'transparent' : 'var(--primary-accent)', color: 'white' }}>
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="avatar-placeholder-lux flex items-center justify-center">
                  {user?.first_name ? user.first_name.charAt(0) : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                </div>
              )}
            </div>
            <div className="profile-info-lux">
              <span className="user-name-lux" style={{ fontSize: '13px' }}>
                {user?.first_name ? `${lang === 'kh' ? 'សួស្តី,' : 'Hi,'} ${user.first_name}` : (lang === 'kh' ? 'សួស្តី ភ្ញៀវ' : 'Hi, Guest')}
              </span>
            </div>
          </div>
        </div>

        <div className="hero-actions-right">
          <div className="lang-switcher-pill" onClick={toggleLang} role="button" tabIndex={0}>
            <img src={lang === 'kh' ? 'https://flagcdn.com/w40/kh.png' : 'https://flagcdn.com/w40/gb.png'} alt="" />
            <span>{lang === 'kh' ? 'KH' : 'EN'}</span>
          </div>
          <div className="theme-toggle-pill" onClick={toggleTheme} role="button" tabIndex={0}>
            <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
          </div>
          <div className="theme-toggle-pill shop-header-notif-btn" onClick={() => setIsNotificationsOpen(true)} role="button" tabIndex={0}>
            <span>🔔</span>
            {hasUnread && <span className="shop-header-notif-dot" aria-hidden="true" />}
          </div>
        </div>
      </div>

      {isSearchVisible && (
        <div className="shop-search-block" ref={searchAreaRef}>
          <div className="shop-header-divider" style={{ margin: '10px -20px 10px -20px' }}></div>

          <div className="shop-search-area animate-in">
            <div className={`shop-search-bar${searchFocused ? ' shop-search-bar--focused' : ''}`}>
              <div className="shop-search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t?.('search_placeholder') || (lang === 'kh' ? 'ស្វែងរកទំនិញ...' : 'Search products...')}
                className={`shop-search-input${lang === 'kh' ? ' shop-search-input--kh' : ''}`}
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitSearch(); }}
              />
              {trimmed ? (
                <button type="button" className="shop-search-clear" onClick={handleClearSearch} aria-label={t?.('search_clear') || 'Clear'}>
                  ✕
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={`shop-action-btn${hasActiveFilters ? ' shop-action-btn--active' : ''}`}
              aria-label={t?.('filter_title') || 'Filter'}
              aria-pressed={hasActiveFilters}
              onClick={() => setShowFilterModal(true)}
            >
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

          {showDropdown && (
            <div className="shop-search-dropdown animate-in">
              {!trimmed && recentSearches.length > 0 && (
                <div className="shop-search-dropdown-section">
                  <div className="shop-search-dropdown-head">
                    <span>{t?.('search_recent') || 'Recent'}</span>
                    <button type="button" className="shop-search-dropdown-clear" onClick={() => { clearRecentSearches(); setRecentSearches([]); }}>
                      {t?.('search_clear') || 'Clear'}
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <button key={term} type="button" className="shop-search-dropdown-item" onClick={() => applySearch(term)}>
                      <span>🕐</span>
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {trimmed && liveSuggestions.length > 0 && (
                <div className="shop-search-dropdown-section">
                  <div className="shop-search-dropdown-head">
                    <span>{t?.('search_suggestions') || 'Suggestions'}</span>
                  </div>
                  {liveSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="shop-search-dropdown-item shop-search-dropdown-item--product"
                      onClick={() => applySearch(p.name)}
                    >
                      <SearchProductThumb image={p.image} name={p.name} />
                      <span className="shop-search-dropdown-name">{p.name}</span>
                      <span className="shop-search-dropdown-price">${p.price}</span>
                    </button>
                  ))}
                </div>
              )}

              {trimmed && liveSuggestions.length === 0 && (
                <div className="shop-search-dropdown-empty">
                  {t?.('search_try_hint') || 'Try different keywords'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} lang={lang} />
    </div>
  );
};

export default ShopHeader;
