import React from 'react';
import DarkSelect from '../DarkSelect';
import { useUser } from '../../../context/UserContext';
import AdminVariationsEditor from './AdminVariationsEditor';

const AdminEditProductModal = React.memo(({
  editingProduct, isUploading, editFormData, setEditFormData, compressImage, setIsUploading,
  fetchWithRetry, BACKEND_URL, headers, categories, setEditingProduct, handlePreview, isSaving, submitEditProduct
}) => {
  const { t } = useUser();
  if (!editingProduct) return null;

  return (
    <div className="admin-dashboard-overhaul" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', padding: '20px', boxSizing: 'border-box' }}>
      <div className="glass-card-luxury" style={{ width: '94%', maxWidth: 440, maxHeight: '90vh', padding: 22, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-surface, #ffffff)', backdropFilter: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border-subtle, rgba(0,0,0,0.15))' }}>
        <h3 style={{ marginBottom: 16, flexShrink: 0, fontSize: 18, fontWeight: 900 }}>{t('admin_edit')}</h3>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 6, paddingBottom: 40 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_image')}</label>
            <label className="upload-zone-luxury" style={{ height: 140, position: 'relative' }}>
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                  <div className="pd-pulse-loader" style={{ fontSize: 28, marginBottom: 8 }}>⌛</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>{t('admin_fetching')}</div>
                </div>
              )}
              {editFormData.image ? (
                <img src={editFormData.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="upload-label-content"><div style={{ fontSize: 24 }}>📦</div><div style={{ fontSize: 13, fontWeight: 800 }}>{t('admin_upload_image')}</div></div>
              )}
              <input type="file" accept="image/*" disabled={isUploading} onChange={async e => {
                const file = e.target.files?.[0];
                if (file) {
                  const compressed = await compressImage(file);
                  const fd = new FormData();
                  fd.append('image', compressed);
                  setIsUploading(true);
                  fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: fd }).then(res => {
                    if (res.success && res.data?.url) setEditFormData(prev => ({ ...prev, image: res.data.url }));
                  }).finally(() => setIsUploading(false));
                }
              }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_name')}</label>
            <input className="input-glass-admin" placeholder={t('admin_product_name')} value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_category')}</label>
            <DarkSelect
              value={categories.some(c => c.name === editFormData.category) ? editFormData.category : 'OTHER'}
              onChange={val => setEditFormData({ ...editFormData, category: val })}
              placeholder={t('admin_product_category')}
              options={[
                ...categories.map(c => ({ value: c.name, label: c.name.replace(/\s*\(.*?\)/g, '') })),
                { value: 'OTHER', label: `➕ ${t('admin_add_product')}` }
              ]}
            />
            <input
              className="input-glass-admin"
              style={{ marginTop: 8, display: categories.some(c => c.name === editFormData.category) ? 'none' : 'block' }}
              placeholder="វាយបញ្ចូលឈ្មោះប្រភេទថ្មី..."
              value={editFormData.category === 'OTHER' ? '' : editFormData.category}
              onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
            />
          </div>

          <div className="admin-responsive-grid" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_price')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_product_price')} value={editFormData.price} onChange={e => setEditFormData({ ...editFormData, price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_stock')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_product_stock')} value={editFormData.stock} onChange={e => setEditFormData({ ...editFormData, stock: e.target.value })} />
            </div>
          </div>
          <div className="admin-responsive-grid" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ {t('admin_flash_sale_price')}</label>
              <input className="input-glass-admin" type="number" placeholder={t('admin_flash_sale_price')} value={editFormData.flash_sale_price} onChange={e => setEditFormData({ ...editFormData, flash_sale_price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ {t('admin_flash_sale_end')}</label>
              <input 
                className="input-glass-admin" 
                type={editFormData.flash_sale_end ? "datetime-local" : "text"} 
                placeholder={t('admin_select_date')}
                onFocus={e => e.target.type = 'datetime-local'}
                onBlur={e => { if(!e.target.value) e.target.type = 'text'; }}
                value={editFormData.flash_sale_end} 
                onChange={e => setEditFormData({ ...editFormData, flash_sale_end: e.target.value })} 
              />
            </div>
          </div>

          <AdminVariationsEditor 
            variants={editFormData.variants || []} 
            setVariants={(v) => setEditFormData({ ...editFormData, variants: v })} 
          />

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>{t('admin_product_desc')}</label>
            <textarea className="input-glass-admin" rows="3" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} placeholder={t('admin_product_desc')}></textarea>
          </div>

          <div className="admin-gallery-editor" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>{t('admin_additional_images')}</label>
            <div className="gallery-grid-lux">
              {(editFormData.additional_images || []).map((img, idx) => (
                <div key={idx} className="gallery-thumb-item">
                  <img src={img} alt="" crossOrigin="anonymous" />
                  <button className="remove-thumb-btn" onClick={() => { const n = [...editFormData.additional_images]; n.splice(idx, 1); setEditFormData({ ...editFormData, additional_images: n }); }}>✕</button>
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
                      if (d.success && d.data?.url) setEditFormData(prev => ({ ...prev, additional_images: [...(prev.additional_images || []), d.data.url] }));
                    }).finally(() => setIsUploading(false));
                  }
                }} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 15, flexShrink: 0 }}>
          <button className="nav-pill-btn btn-destructive" style={{ flex: 1, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={() => setEditingProduct(null)}>{t('cancel')}</button>
          <button className="nav-pill-btn btn-preview" style={{ flex: 1, minHeight: 48, padding: '0 5px' }} onClick={() => handlePreview(editFormData)}>👁️ {t('admin_preview')}</button>
          <button className="ticket-btn-primary" style={{ flex: 1.2, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={submitEditProduct}>
            {isSaving ? `⌛ ${t('admin_saving')}` : t('admin_save')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AdminEditProductModal;
