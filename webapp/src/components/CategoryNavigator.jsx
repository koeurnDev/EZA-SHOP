import React, { useMemo } from 'react';
import { useShopState } from '../context/ShopContext';
import { useUserState } from '../context/UserContext';
import { getCategoryBucket } from '../utils/langUtils';

const PREDEFINED_CATEGORIES = [
  { id: 'fashion', kh: 'សម្លៀកបំពាក់', en: 'Fashion', icon: '/Fashion & Shoes.webp' },
  { id: 'beauty', kh: 'គ្រឿងសម្អាង', en: 'Beauty', icon: '/Beauty & Care (1).webp' },
  { id: 'electronics', kh: 'អេឡិចត្រូនិក', en: 'Electronics', icon: '/Electronics.webp' },
  { id: 'home', kh: 'ផ្ទះ', en: 'Home', icon: '/Home & Living.webp' },
  { id: 'accessories', kh: 'កាបូប', en: 'Bags', icon: '/Bags & Accessories.webp' },
  { id: 'gifts', kh: 'កាដូ', en: 'Gifts', icon: '/Gifts & Gadgets.webp' },
  { id: 'promo', kh: 'ប្រូម៉ូសិន', en: 'Promo', icon: '/PROMO & SALE.webp' },
  { id: 'others', kh: 'ផ្សេងៗ', en: 'Others', icon: '/Gifts & Gadgets.webp' }
];

const CategoryNavigator = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, t }) => {
  const { lang } = useUserState();
  const [localSearch, setLocalSearch] = React.useState(searchTerm);
  const timeoutRef = React.useRef(null);
  const { products } = useShopState();

  const categories = useMemo(() => {
    // Check if there are any flash sale products
    let hasFlashSale = false;

    (products || []).forEach(p => {
      if (p && (parseInt(p.stock) || 0) > 0 && !p.hidden) {
        if (p.flash_sale_price && p.flash_sale_end && new Date(p.flash_sale_end) > new Date()) {
          hasFlashSale = true;
        }
      }
    });

    // Show all predefined categories regardless of stock
    const allPredefined = PREDEFINED_CATEGORIES.map(c => ({
      id: c.id,
      label: lang === 'kh' ? c.kh : c.en,
      icon: c.icon
    }));

    return [
      { id: 'all', label: t('all'), icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-1 -1 26 26' fill='%23ff72a0'%3E%3Crect x='3' y='3' width='8' height='8' rx='3'/%3E%3Crect x='13' y='3' width='8' height='8' rx='3'/%3E%3Crect x='3' y='13' width='8' height='8' rx='3'/%3E%3Crect x='13' y='13' width='8' height='8' rx='3'/%3E%3C/svg%3E" },
      ...allPredefined,
      ...(hasFlashSale ? [{ id: 'flash_sale', label: '⚡ Flash Sale', icon: '/PROMO & SALE.webp' }] : [])
    ];
  }, [products, lang, t]);

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
            {cat.icon && <img src={cat.icon} alt="" className="cat-pill-icon" />}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(CategoryNavigator);
