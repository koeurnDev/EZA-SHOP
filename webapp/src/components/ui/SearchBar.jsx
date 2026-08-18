import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useShopDispatch, useShopState } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  getSearchSuggestions
} from '../../utils/searchUtils';
import { getOptimizedThumbUrl, reportBrokenImageUrl, isKnownBrokenImage } from '../../utils/imageUtils';
import './ShopHeader.css';

const SearchProductThumb = ({ image, name }) => {
  const [failed, setFailed] = useState(() => isKnownBrokenImage(image));
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

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  const inputRef = useRef(null);
  const searchAreaRef = useRef(null);
  
  const { setShowFilterModal, setSearchFocused } = useShopDispatch();
  const { products, searchFocused } = useShopState();
  const { lang, t } = useUserState();
  
  const [recentSearches, setRecentSearches] = useState([]);

  const trimmed = (searchTerm || '').trim();
  const showDropdown = searchFocused;

  const liveSuggestions = useMemo(() => {
    if (!trimmed) return [];
    return getSearchSuggestions(products, trimmed, 5);
  }, [products, trimmed]);

  useEffect(() => {
    if (searchFocused) setRecentSearches(getRecentSearches());
  }, [searchFocused]);

  useEffect(() => {
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
    inputRef.current?.blur();
    setSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchTerm?.('');
    inputRef.current?.focus();
  };

  const commitSearch = () => {
    if (trimmed.length >= 2) addRecentSearch(trimmed);
    inputRef.current?.blur();
    setSearchFocused(false);
  };

  return (
    <div className="shop-search-block" ref={searchAreaRef} style={{ position: 'relative', marginBottom: '16px' }}>
      <div className="shop-search-area animate-in">
        <div className={`shop-search-bar${searchFocused ? ' shop-search-bar--focused' : ''}`}>
          <div className="shop-search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            ref={inputRef}
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
          className="shop-action-btn" 
          aria-label={t?.('filter_title') || 'Filter'} 
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
  );
};

export default SearchBar;
