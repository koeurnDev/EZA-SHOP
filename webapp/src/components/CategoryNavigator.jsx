import React from 'react';

const CategoryNavigator = ({ searchTerm, setSearchTerm, selectedCategory, setSelectedCategory, t }) => {
  const [localSearch, setLocalSearch] = React.useState(searchTerm);
  const timeoutRef = React.useRef(null);

  const categories = [
    { id: 'all', label: t('all') },
    { id: 'perfume', label: t('perfume') },
    { id: 'bodycare', label: t('bodycare') },
    { id: 'new', label: t('new') },
    { id: 'flash_sale', label: '⚡ Flash Sale' }
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
