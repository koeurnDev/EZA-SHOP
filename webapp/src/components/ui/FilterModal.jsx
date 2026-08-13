import React, { useState, useEffect } from 'react';
import { useShopState, useShopDispatch } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import './FilterModal.css';

const DEFAULT_FILTERS = { minPrice: '', maxPrice: '', sort: 'newest' };

const FilterModal = () => {
  const { filters, showFilterModal } = useShopState();
  const { setFilters, setShowFilterModal } = useShopDispatch();
  const { t } = useUserState();

  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (showFilterModal) setLocalFilters(filters);
  }, [showFilterModal, filters]);

  if (!showFilterModal) return null;

  const sortOptions = [
    { value: 'newest', label: t('filter_sort_newest') },
    { value: 'price_asc', label: t('filter_sort_price_asc') },
    { value: 'price_desc', label: t('filter_sort_price_desc') },
  ];

  const handleApply = () => {
    setFilters(localFilters);
    setShowFilterModal(false);
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setShowFilterModal(false);
  };

  return (
    <div className="filter-overlay" onClick={() => setShowFilterModal(false)}>
      <div className="filter-modal" onClick={e => e.stopPropagation()}>
        <div className="filter-header">
          <h3>{t('filter_title')}</h3>
          <button type="button" className="close-btn" onClick={() => setShowFilterModal(false)} aria-label={t('close')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="filter-body">
          <div className="filter-section">
            <span className="filter-label">{t('filter_sort_by')}</span>
            <div className="filter-sort-options" role="listbox" aria-label={t('filter_sort_by')}>
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={localFilters.sort === opt.value}
                  className={`filter-sort-pill${localFilters.sort === opt.value ? ' active' : ''}`}
                  onClick={() => setLocalFilters({ ...localFilters, sort: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label">{t('filter_price')}</span>
            <div className="price-inputs">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={t('filter_min')}
                value={localFilters.minPrice}
                onChange={e => setLocalFilters({ ...localFilters, minPrice: e.target.value })}
                className="price-input"
                aria-label={t('filter_min')}
              />
              <span className="price-separator">–</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={t('filter_max')}
                value={localFilters.maxPrice}
                onChange={e => setLocalFilters({ ...localFilters, maxPrice: e.target.value })}
                className="price-input"
                aria-label={t('filter_max')}
              />
            </div>
          </div>
        </div>

        <div className="filter-footer">
          <button type="button" className="filter-btn-reset" onClick={handleReset}>
            {t('filter_reset')}
          </button>
          <button type="button" className="filter-btn-apply" onClick={handleApply}>
            {t('filter_apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
