import React, { useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';
import { useShopState, useShopDispatch } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { useCartDispatch } from '../context/CartContext';
import { useTelegram } from '../context/TelegramContext';
import { formatCategory } from '../utils/langUtils';
import { productMatchesSearch, getSearchSuggestions } from '../utils/searchUtils';

const SkeletonGrid = () => (
  <div className="product-grid-main grid grid-cols-2 gap-3 px-4 pb-5">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);

const ProductGrid = () => {
  const [limit, setLimit] = React.useState(14);
  const { products, searchTerm, debouncedSearchTerm, selectedCategory, activeDiscounts, isSettingsLoaded, filters } = useShopState();
  const { setView, setSelectedProduct, setSearchTerm } = useShopDispatch();
  const { t, lang } = useUserState();
  const { addToCart } = useCartDispatch();
  const { tg } = useTelegram();

  const discountLookup = useMemo(() => {
    const lookup = {};
    (activeDiscounts || []).forEach(d => {
      if (d.apply_to === 'all') {
        if (!lookup['all'] || lookup['all'].value < d.value) lookup['all'] = d;
      } else if (d.product_ids) {
        d.product_ids.forEach(pid => {
          if (!lookup[pid] || lookup[pid].value < d.value) lookup[pid] = d;
        });
      }
    });
    return lookup;
  }, [activeDiscounts]);

  const filtered = useMemo(() => {
    return (products || [])
      .filter(p => {
        const searchLower = (debouncedSearchTerm || '').trim();
        const matchesSearch = searchLower === '' || productMatchesSearch(p, searchLower);
        const matchesCategory = selectedCategory === 'all' || 
                                (selectedCategory === 'flash_sale' ? p.flash_sale_price : p.category === selectedCategory);
        
        const price = Number(p.price);
        const minP = Number(filters?.minPrice);
        const maxP = Number(filters?.maxPrice);
        
        const matchesMinPrice = filters?.minPrice ? price >= minP : true;
        const matchesMaxPrice = filters?.maxPrice ? price <= maxP : true;
        
        return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
      })
      .sort((a, b) => {
        if (filters?.sort === 'price_asc') return Number(a.price) - Number(b.price);
        if (filters?.sort === 'price_desc') return Number(b.price) - Number(a.price);
        
        // Default sort: in-stock first
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;
        return 0;
      });
  }, [products, debouncedSearchTerm, selectedCategory, filters]);

  const displayed = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hasMore = filtered.length > limit;

  const featured = useMemo(() => {
    const list = (products || []).filter(p => p.stock > 0);
    const marked = list.filter(p => p.is_featured);
    if (marked.length >= 10) return marked.slice(0, 10);
    const combined = [...marked, ...list.filter(p => !p.is_featured)];
    return combined.slice(0, 10);
  }, [products]);
  const hasActiveFilters = filters?.minPrice || filters?.maxPrice || (filters?.sort && filters.sort !== 'newest');
  const showFeatured = !debouncedSearchTerm?.trim() && selectedCategory === 'all' && !hasActiveFilters && featured.length > 0;

  const emptySuggestions = useMemo(() => {
    if (!debouncedSearchTerm?.trim() || filtered.length > 0) return [];
    return getSearchSuggestions(products, debouncedSearchTerm, 4);
  }, [products, debouncedSearchTerm, filtered.length]);

  const popularFallback = useMemo(() => {
    if (filtered.length > 0 || !debouncedSearchTerm?.trim()) return [];
    return featured.slice(0, 4);
  }, [filtered.length, debouncedSearchTerm, featured]);

  const handleViewProduct = React.useCallback((product) => {
    setSelectedProduct(product);
    setView('product_detail');
  }, [setSelectedProduct, setView]);

  const handleShowMore = () => {
    if (tg?.isVersionAtLeast?.('6.1') && tg.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
    setLimit(prev => prev + 20);
  };

  return (
    <div className="section-container">
      {/* ✨ FEATURED ITEMS */}
      {showFeatured && (
        <div className="mb-6">
           <div className="section-header section-header--compact pb-2 flex items-baseline gap-2">
             <h2 className="product-section-title text-bold">{t('new')}</h2>
             <span className="featured-section-badge text-xs font-semibold text-bold">{lang === 'kh' ? 'លេចធ្លោ ✨' : 'Featured ✨'}</span>
           </div>
          <div className="featured-slider flex overflow-x-auto gap-4 pb-5 no-scrollbar">
            {featured.map(fp => (
              <ProductCard 
                key={`feat-${fp.id}`}
                product={fp}
                onAdd={addToCart}
                onViewProduct={handleViewProduct}
                discountLookup={discountLookup}
                variant="featured"
              />
            ))}
          </div>
        </div>
      )}

      {/* 🛍 MAIN GRID HEADER */}
      <div className="section-header section-header--compact py-3 flex justify-between items-center">
        <h2 className="product-section-title text-bold break-words leading-[1.2]">
          {searchTerm ? `"${searchTerm}"` : selectedCategory === 'all' ? t('all') : selectedCategory === 'flash_sale' ? '⚡ Flash Sale' : formatCategory(selectedCategory, lang)}
        </h2>
        <span className="product-section-count text-muted whitespace-nowrap">
          {filtered.length} {t('items')}
        </span>
      </div>

      <div>
        {!isSettingsLoaded ? (
          <SkeletonGrid />
        ) : (
          <>
            <div className="product-grid-main grid grid-cols-2 gap-3 pb-4">
              {displayed.length === 0 ? (
                <div className="col-span-2 search-empty-state">
                  <div className="search-empty-icon">🔍</div>
                  <p className="search-empty-title">
                    {debouncedSearchTerm?.trim() ? t('search_no_results') : (lang === 'kh' ? 'មិនទាន់មានទំនិញទេ' : 'No products available')}
                  </p>
                  <p className="search-empty-hint">
                    {debouncedSearchTerm?.trim() ? t('search_try_hint') : (lang === 'kh' ? 'សូមពិនិត្យម្តងទៀតក្រោយ' : 'Please check back later')}
                  </p>
                  {debouncedSearchTerm?.trim() && (
                    <button type="button" className="search-empty-clear-btn" onClick={() => setSearchTerm('')}>
                      {t('search_clear')}
                    </button>
                  )}
                  {emptySuggestions.length > 0 && (
                    <div className="search-empty-suggestions">
                      <span className="search-empty-label">{t('search_suggestions')}</span>
                      <div className="search-empty-chips">
                        {emptySuggestions.map((p) => (
                          <button key={p.id} type="button" className="search-chip" onClick={() => setSearchTerm(p.name)}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {popularFallback.length > 0 && (
                    <div className="search-empty-popular">
                      <span className="search-empty-label">{t('search_popular')}</span>
                      <div className="product-grid-main grid grid-cols-2 gap-3 pt-2">
                        {popularFallback.map((product) => (
                          <ProductCard
                            key={`pop-${product.id}`}
                            product={product}
                            onAdd={addToCart}
                            onViewProduct={handleViewProduct}
                            discountLookup={discountLookup}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                displayed.map((product, idx) => (
                  <div key={product.id} className={idx < 6 ? `stagger-item` : ''} style={idx < 6 ? { animationDelay: `${Math.min((idx + 1) * 80, 400)}ms` } : {}}>
                    <ProductCard 
                      product={product} 
                      onAdd={addToCart} 
                      onViewProduct={handleViewProduct} 
                      discountLookup={discountLookup} 
                    />
                  </div>
                ))
              )}
            </div>
            
            {hasMore && (
              <div className="load-more-wrap">
                <button 
                  type="button"
                  onClick={handleShowMore}
                  className="load-more-btn"
                >
                  {t('show_more')}
                  <span className="load-more-count">{filtered.length - limit}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;
