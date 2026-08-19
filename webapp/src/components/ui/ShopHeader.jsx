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
      <div className="shop-header-top flex justify-between items-center w-full gap-2">
        <div className="flex items-center gap-2.5">
          {view !== 'home' && view !== 'browse' ? (
            <button className="shop-back-btn shrink-0" onClick={() => setView('home')} aria-label="Go back">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          ) : null}

          <div className="profile-badge-luxury shrink-0 cursor-pointer px-3.5 py-1.5" onClick={() => setView('profile')}>
            {user?.photo_url && (
              <div className="avatar-mini-lux bg-transparent">
                <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="profile-info-lux">
              <span className="user-name-lux text-[13px]">
                {user?.first_name && user.first_name !== 'Guest' ? user.first_name : (lang === 'kh' ? 'ភ្ញៀវ' : 'Guest')}
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



      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} lang={lang} />
    </div>
  );
};

export default ShopHeader;
