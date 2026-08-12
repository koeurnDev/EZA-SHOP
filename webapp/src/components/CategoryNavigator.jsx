import React, { useMemo } from 'react';
import { useShopState } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';

const CategoryNavigator = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, t }) => {
  const { lang } = useUserState();
  const [localSearch, setLocalSearch] = React.useState(searchTerm);
  const timeoutRef = React.useRef(null);
  const { products } = useShopState();

  const dynamicCategories = useMemo(() => {
    const cats = new Set();
    (products || []).forEach(p => {
      if (p && (parseInt(p.stock) || 0) > 0) {
        const c = p.category;
        if (c && c !== 'all' && c !== 'new' && c !== 'flash_sale') {
          cats.add(c);
        }
      }
    });
    return Array.from(cats).map(c => {
      let label = c;
      if (lang === 'kh') {
        label = c.replace(/\s*\(.*?\)/g, '');
      } else {
        const match = c.match(/\((.*?)\)/);
        label = match ? match[1] : c.replace(/\s*\(.*?\)/g, '');
      }
      return { id: c, label };
    });
  }, [products, lang]);

  const hasFlashSale = useMemo(() => {
    return (products || []).some(p => p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date() && (parseInt(p.stock) || 0) > 0);
  }, [products]);

  const categories = [
    { id: 'all', label: t('all') },
    ...dynamicCategories,
    { id: 'new', label: t('new') },
    ...(hasFlashSale ? [{ id: 'flash_sale', label: '⚡ Flash Sale' }] : [])
  ];

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setLocalSearch(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSearchTerm(val);
    }, 300); // 🛡 Senior 12-Year Exp: Debounced (300ms)
  };

  React.useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div className="search-browse-wrapper animate-in">


      <div className="category-navigator">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            className={`cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CategoryNavigator);
