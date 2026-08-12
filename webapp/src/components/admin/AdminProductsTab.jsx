import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminProductsTab = React.memo(({
  products, categories = [], productSearchTerm, localProductSearchTerm, setLocalProductSearchTerm,
  setIsAddingProduct, setEditingProduct, setEditFormData,
  visibleProductLimit, setVisibleProductLimit, handleDeleteProduct, onScanBrokenImages
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
      {/* Top bar: Search + Add button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <input
          className="input-glass-admin"
          style={{ flex: 1, padding: '10px 14px', borderRadius: 12, fontSize: 13 }}
          placeholder={t('admin_search_product') || 'ស្វែងរកទំនិញ...'}
          value={localProductSearchTerm}
          onChange={e => setLocalProductSearchTerm(e.target.value)}
        />
        <button
          onClick={() => setIsAddingProduct(true)}
          style={{
            flexShrink: 0, padding: '10px 16px', borderRadius: 12,
            border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)',
            transition: 'all 0.2s ease'
          }}
        >
          ➕ {t('admin_add_product') || 'បន្ថែម'}
        </button>
        {onScanBrokenImages && (
          <button
            type="button"
            onClick={onScanBrokenImages}
            title="Scan Cloudinary 404s"
            style={{
              flexShrink: 0, padding: '10px 12px', borderRadius: 12,
              border: '1px solid var(--border-subtle)', background: 'var(--bg-soft)',
              color: 'var(--text-main)', fontWeight: 800, fontSize: 12, cursor: 'pointer',
            }}
          >
            🖼️ Scan
          </button>
        )}
      </div>

      {/* Category chips row — no dropdown, no overlap */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16,
        scrollbarWidth: 'none', msOverflowStyle: 'none'
      }}>
        {[{ name: 'all', label: '📦 ទាំងអស់' }, ...categories.map(c => ({ name: c.name, label: (c.name || '').replace(/\s*\(.*?\)/g, '') }))].map((c, i) => {
          const isActive = selectedCategory === c.name;
          return (
            <button
              key={i}
              onClick={() => setSelectedCategory(c.name)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                border: isActive ? 'none' : '1px solid var(--border-subtle)',
                background: isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-soft)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 30 }}>
        {filtered.slice(0, visibleProductLimit).map(p => (
          <div key={p.id} className="glass-card-luxury" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', position: 'relative', zIndex: openMenu === p.id ? 50 : 1 }}>
            <img src={p.image || '/favicon.png'} onError={(e) => { e.target.onerror = null; e.target.src = '/favicon.png'; }} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt={p.name} crossOrigin="anonymous" />
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
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 499 }} onClick={(e) => { e.stopPropagation(); setOpenMenu(null); }}></div>
                <div className="dropdown-menu-animate" style={{ position: 'absolute', right: 12, top: 50, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 6, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 12px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.12)', minWidth: 140 }}>
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
                    កែប្រែ
                  </button>
                  <button style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '10px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 }} onClick={() => {
                    setOpenMenu(null);
                    handleDeleteProduct(p.id, p.name);
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    លុប
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
