import React from 'react';
import DarkSelect from '../DarkSelect';
import { useUser } from '../../../context/UserContext';
import AdminVariationsEditor from './AdminVariationsEditor';

const AdminAddProductModal = React.memo(({
  isAddingProduct, isUploading, newProductData, setNewProductData, compressImage, setIsUploading,
  fetchWithRetry, BACKEND_URL, headers, categories, setIsAddingProduct, handlePreview, isSaving, submitAddProduct
}) => {
  const { t } = useUser();
  if (!isAddingProduct) return null;

  return (
    <div className="admin-dashboard-overhaul" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(8px)', padding: '20px', boxSizing: 'border-box' }}>
      <div className="glass-card-luxury" style={{ width: '92%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-midnight)', backdropFilter: 'none' }}>
        <h3 style={{ marginBottom: 20, flexShrink: 0 }}>➕ {t('admin_add_product')}</h3>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5, paddingBottom: 5 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_image')}</label>
            <label className="upload-zone-luxury" style={{ height: 140, position: 'relative' }}>
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                  <div className="pd-pulse-loader" style={{ fontSize: 28, marginBottom: 8 }}>⌛</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>{t('admin_fetching')}</div>
                </div>
              )}
              {newProductData.image ? (
                <img src={newProductData.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="upload-label-content"><div style={{ fontSize: 24 }}>✨</div><div style={{ fontSize: 13, fontWeight: 800 }}>{t('admin_upload_image')}</div></div>
              )}
              <input type="file" accept="image/*" disabled={isUploading} onChange={async e => {
                const file = e.target.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  const fd = new FormData();
                  fd.append('image', compressed);
                  setIsUploading(true);
                  fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(res => {
                    if (res.success && res.data?.url) setNewProductData(prev => ({ ...prev, image: res.data.url }));
                  }).finally(() => setIsUploading(false));
                }
              }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_name')}</label>
            <input className="input-glass-admin" placeholder={t('admin_product_name')} value={newProductData.name} onChange={e => setNewProductData({ ...newProductData, name: e.target.value })} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_category')}</label>
            <DarkSelect
              value={categories.some(c => c.name === newProductData.category) ? newProductData.category : 'OTHER'}
              onChange={val => setNewProductData({ ...newProductData, category: val })}
              placeholder={t('admin_product_category')}
              options={[
                ...categories.map(c => ({ value: c.name, label: c.name.replace(/\s*\(.*?\)/g, '') })),
                { value: 'OTHER', label: `➕ ${t('admin_add_product')}` }
              ]}
            />
            <input
              className="input-glass-admin"
              style={{ marginTop: 8, display: categories.some(c => c.name === newProductData.category) ? 'none' : 'block' }}
              placeholder="វាយបញ្ចូលឈ្មោះប្រភេទថ្មី..."
              value={newProductData.category === 'OTHER' ? '' : newProductData.category}
              onChange={e => setNewProductData({ ...newProductData, category: e.target.value })}
            />
          </div>

          <div className="admin-responsive-grid" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_price')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_product_price')} value={newProductData.price} onChange={e => setNewProductData({ ...newProductData, price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_stock')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_product_stock')} value={newProductData.stock} onChange={e => setNewProductData({ ...newProductData, stock: e.target.value })} />
            </div>
          </div>
          <div className="admin-responsive-grid" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ {t('admin_flash_sale_price')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_flash_sale_price')} value={newProductData.flash_sale_price} onChange={e => setNewProductData({ ...newProductData, flash_sale_price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ {t('admin_flash_sale_end')}</label>
              <input 
                className="input-glass-admin" 
                type={newProductData.flash_sale_end ? "datetime-local" : "text"} 
                placeholder={t('admin_select_date')}
                onFocus={e => e.target.type = 'datetime-local'}
                onBlur={e => { if(!e.target.value) e.target.type = 'text'; }}
                value={newProductData.flash_sale_end} 
                onChange={e => setNewProductData({ ...newProductData, flash_sale_end: e.target.value })} 
              />
            </div>
          </div>

          <AdminVariationsEditor 
            variants={newProductData.variants || []} 
            setVariants={(v) => setNewProductData({ ...newProductData, variants: v })} 
          />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_desc')}</label>
            <textarea className="input-glass-admin" rows="3" value={newProductData.description} onChange={e => setNewProductData({ ...newProductData, description: e.target.value })} placeholder={t('admin_product_desc')}></textarea>
          </div>

          <div className="admin-gallery-editor" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>{t('admin_additional_images')}</label>
            <div className="gallery-grid-lux">
              {(newProductData.additional_images || []).map((img, idx) => (
                <div key={idx} className="gallery-thumb-item">
                  <img src={img} alt="" crossOrigin="anonymous" />
                  <button className="remove-thumb-btn" onClick={() => { const n = [...newProductData.additional_images]; n.splice(idx, 1); setNewProductData({ ...newProductData, additional_images: n }); }}>✕</button>
                </div>
              ))}
              <label className="add-gallery-slot" style={{ position: 'relative' }}>
                {isUploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, borderRadius: 16 }}>
                    <div className="pd-pulse-loader" style={{ fontSize: 18 }}>⌛</div>
                  </div>
                )}
                <span>+</span><label>{t('admin_add_image')}</label>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploading} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressed = await compressImage(file);
                    const fd = new FormData();
                    fd.append('image', compressed);
                    setIsUploading(true);
                    fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(d => {
                      if (d.success && d.data?.url) setNewProductData(prev => ({ ...prev, additional_images: [...(prev.additional_images || []), d.data.url] }));
                    }).finally(() => setIsUploading(false));
                  }
                }} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 15, flexShrink: 0 }}>
          <button className="nav-pill-btn btn-destructive" style={{ flex: 1, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={() => setIsAddingProduct(false)}>{t('cancel')}</button>
          <button className="nav-pill-btn btn-preview" style={{ flex: 1, minHeight: 48, padding: '0 5px' }} onClick={() => handlePreview(newProductData)}>👁️ {t('admin_preview')}</button>
          <button className="ticket-btn-primary" style={{ flex: 1.2, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={submitAddProduct}>
            {isSaving ? `⌛ ${t('admin_saving')}` : t('admin_save')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AdminAddProductModal;
