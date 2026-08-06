import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminProductsTab = React.memo(({
  products, productSearchTerm, localProductSearchTerm, setLocalProductSearchTerm,
  setIsAddingProduct, setEditingProduct, setEditFormData,
  visibleProductLimit, setVisibleProductLimit
}) => {
  const { t } = useUser();
  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  return (
    <div className="tab-pane-animate">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10 }}>
        <input
          className="input-glass-admin"
          style={{ flex: 1, maxWidth: 300 }}
          placeholder={t('admin_search_product')}
          value={localProductSearchTerm}
          onChange={e => setLocalProductSearchTerm(e.target.value)}
        />
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
          <div key={p.id} className="glass-card-luxury" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <img src={p.image} style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} alt={p.name} crossOrigin="anonymous" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-main)', fontWeight: 800, marginTop: 4 }}>
                {(p.category || '').replace(/\s*\(.*?\)/g, '')} • ${p.price} • {t('stock')} {p.stock}
              </div>
            </div>
            <button className="icon-btn-admin" aria-label="Edit product" onClick={() => {
              setEditingProduct(p);
              setEditFormData({
                name: p.name, price: p.price, stock: p.stock, category: p.category,
                description: p.description || '', image: p.image || '',
                additional_images: typeof p.additional_images === 'string' ? JSON.parse(p.additional_images) : (p.additional_images || []),
                flash_sale_price: p.flash_sale_price || '',
                flash_sale_end: p.flash_sale_end ? new Date(p.flash_sale_end).toISOString().slice(0, 16) : '',
                video_url: p.video_url || ''
              });
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
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
