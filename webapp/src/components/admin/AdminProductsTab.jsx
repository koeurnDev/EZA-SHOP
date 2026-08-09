import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminProductsTab = React.memo(({
  products, categories = [], productSearchTerm, localProductSearchTerm, setLocalProductSearchTerm,
  setIsAddingProduct, setEditingProduct, setEditFormData,
  visibleProductLimit, setVisibleProductLimit, handleDeleteProduct
}) => {
  const { t } = useUser();
  const [openMenu, setOpenMenu] = React.useState(null);
  const [selectedCategory, setSelectedCategory] = React.useState('all');

  const filtered = products.filter(p => {
    const term = productSearchTerm.toLowerCase().trim();
    const matchesSearch = (p.name || '').toLowerCase().includes(term) ||
           (p.category || '').toLowerCase().includes(term) ||
           (p.id && p.id.toString().includes(term));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="tab-pane-animate">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <div style={{ display: 'flex', flex: 1, gap: 10, maxWidth: 500 }}>
          <input
            className="input-glass-admin"
            style={{ flex: 1 }}
            placeholder={t('admin_search_product')}
            value={localProductSearchTerm}
            onChange={e => setLocalProductSearchTerm(e.target.value)}
          />
          <select 
            className="input-glass-admin"
            style={{ flex: 1 }}
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">ប្រភេទទាំងអស់</option>
            {categories.map((c, i) => (
              <option key={i} value={c.name}>{(c.name || '').replace(/\s*\(.*?\)/g, '')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setIsAddingProduct(true)}
          style={{
            flexShrink: 0, padding: '12px 18px', borderRadius: 14,
            border: '1.5px solid var(--border-subtle)', background: 'transparent',
            color: 'var(--text-luxury)', fontWeight: 900, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-border)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          ➕ {t('admin_add_product')}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
        {filtered.slice(0, visibleProductLimit).map(p => (
          <div key={p.id} className="glass-card-luxury" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', position: 'relative', zIndex: openMenu === p.id ? 50 : 1 }}>
            <img src={p.image} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt={p.name} crossOrigin="anonymous" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-main)', fontWeight: 800, marginTop: 4 }}>
                ID: {p.id} • {(p.category || '').replace(/\s*\(.*?\)/g, '')} • ${p.price} • {t('stock')} {p.stock}
              </div>
            </div>
            
            <button className="icon-btn-admin" aria-label="Options" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>

            {openMenu === p.id && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }}></div>
                <div className="dropdown-menu-animate" style={{ position: 'absolute', right: 12, top: 50, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 6, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 140 }}>
                  <button style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }} onClick={() => {
                    setOpenMenu(null);
                    setEditingProduct(p);
                    setEditFormData({
                      name: p.name, price: p.price, stock: p.stock, category: p.category,
                      description: p.description || '', image: p.image || '',
                      additional_images: typeof p.additional_images === 'string' ? JSON.parse(p.additional_images) : (p.additional_images || []),
                      flash_sale_price: p.flash_sale_price || '',
                      flash_sale_end: p.flash_sale_end ? new Date(p.flash_sale_end).toISOString().slice(0, 16) : '',
                      video_url: p.video_url || ''
                    });
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    កែប្រែ (Edit)
                  </button>
                  <button style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }} onClick={() => {
                    setOpenMenu(null);
                    handleDeleteProduct(p.id, p.name);
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    លុប (Delete)
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {filtered.length > visibleProductLimit && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button className="nav-pill-btn" style={{ margin: '0 auto', maxWidth: 200 }} onClick={() => setVisibleProductLimit(prev => prev + 30)}>
            ⬇️ {t('admin_load_more')}
          </button>
        </div>
      )}
    </div>
  );
});

export default AdminProductsTab;
