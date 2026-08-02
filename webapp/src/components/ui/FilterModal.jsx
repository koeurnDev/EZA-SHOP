import React, { useState } from 'react';
import { useShopState, useShopDispatch } from '../../context/ShopContext';
import { useUserState } from '../../context/UserContext';
import './FilterModal.css';

const FilterModal = () => {
  const { filters, showFilterModal } = useShopState();
  const { setFilters, setShowFilterModal } = useShopDispatch();
  const { lang } = useUserState();

  const [localFilters, setLocalFilters] = useState(filters);

  if (!showFilterModal) return null;

  const handleApply = () => {
    setFilters(localFilters);
    setShowFilterModal(false);
  };

  const handleReset = () => {
    const defaultFilters = { minPrice: '', maxPrice: '', sort: 'newest' };
    setLocalFilters(defaultFilters);
    setFilters(defaultFilters);
    setShowFilterModal(false);
  };

  return (
    <div className="filter-overlay" onClick={() => setShowFilterModal(false)}>
      <div className="filter-modal" onClick={e => e.stopPropagation()}>
        <div className="filter-header">
          <h3>{lang === 'kh' ? 'ចម្រាញ់ទំនិញ' : 'Filter Products'}</h3>
          <button className="close-btn" onClick={() => setShowFilterModal(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="filter-body">
          {/* Sort Options */}
          <div className="filter-section">
            <label className="filter-label">{lang === 'kh' ? 'តម្រៀបតាម' : 'Sort By'}</label>
            <select 
              className="price-input" 
              value={localFilters.sort} 
              onChange={e => setLocalFilters({...localFilters, sort: e.target.value})}
              style={{ padding: '12px 16px', background: 'var(--bg-surface)', cursor: 'pointer', color: 'var(--text-main)' }}
            >
              <option value="newest">{lang === 'kh' ? 'ថ្មីៗបំផុត (Newest First)' : 'Newest First'}</option>
              <option value="price_asc">{lang === 'kh' ? 'តម្លៃ (ទាបទៅខ្ពស់)' : 'Price: Low to High'}</option>
              <option value="price_desc">{lang === 'kh' ? 'តម្លៃ (ខ្ពស់ទៅទាប)' : 'Price: High to Low'}</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <label className="filter-label">{lang === 'kh' ? 'តម្លៃ ($)' : 'Price Range ($)'}</label>
            <div className="price-inputs">
              <input 
                type="number" 
                placeholder="Min" 
                value={localFilters.minPrice} 
                onChange={e => setLocalFilters({...localFilters, minPrice: e.target.value})}
                className="price-input"
              />
              <span className="price-separator">-</span>
              <input 
                type="number" 
                placeholder="Max" 
                value={localFilters.maxPrice} 
                onChange={e => setLocalFilters({...localFilters, maxPrice: e.target.value})}
                className="price-input"
              />
            </div>
          </div>
        </div>

        <div className="filter-footer">
          <button className="filter-btn-reset" onClick={handleReset}>
            {lang === 'kh' ? 'កំណត់ឡើងវិញ' : 'Reset'}
          </button>
          <button className="filter-btn-apply" onClick={handleApply}>
            {lang === 'kh' ? 'យល់ព្រម' : 'Apply Filters'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
