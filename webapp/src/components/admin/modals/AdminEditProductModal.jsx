import React from 'react';
import DarkSelect from '../DarkSelect';

const AdminEditProductModal = React.memo(({
  editingProduct, isUploading, editFormData, setEditFormData, compressImage, setIsUploading,
  fetchWithRetry, BACKEND_URL, headers, categories, setEditingProduct, handlePreview, isSaving, submitEditProduct
}) => {
  if (!editingProduct) return null;

  return (
    <div className="admin-dashboard-overhaul" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'var(--bg-soft)' }}>
      <div className="glass-card-luxury" style={{ width: '92%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ marginBottom: 20, flexShrink: 0 }}>✏️ កែប្រែទំនិញ</h3>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5, paddingBottom: 5 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>រូបភាពទំនិញ</label>
            <label className="upload-zone-luxury" style={{ height: 140, position: 'relative' }}>
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 20 }}>
                  <div className="pd-pulse-loader" style={{ fontSize: 28, marginBottom: 8 }}>⌛</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>កំពុងផ្ទុក...</div>
                </div>
              )}
              {editFormData.image ? (
                <img src={editFormData.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="upload-label-content"><div style={{ fontSize: 24 }}>📦</div><div style={{ fontSize: 13, fontWeight: 800 }}>ប្តូររូបភាព</div></div>
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
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ឈ្មោះទំនិញ</label>
            <input className="input-glass-admin" placeholder="ឈ្មោះ" value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ប្រភេទ</label>
            <DarkSelect
              value={categories.some(c => c.name === editFormData.category) ? editFormData.category : 'OTHER'}
              onChange={val => setEditFormData({ ...editFormData, category: val })}
              placeholder="រើសប្រភេទ..."
              options={[
                ...categories.map(c => ({ value: c.name, label: c.name })),
                { value: 'OTHER', label: '➕ បន្ថែមប្រភេទថ្មី (Add New)' }
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>តម្លៃ ($)</label>
              <input className="input-glass-admin" type="number" placeholder="តម្លៃ ($)" value={editFormData.price} onChange={e => setEditFormData({ ...editFormData, price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ស្តុក</label>
              <input className="input-glass-admin" type="number" placeholder="ស្តុក" value={editFormData.stock} onChange={e => setEditFormData({ ...editFormData, stock: e.target.value })} />
            </div>
          </div>
          <div className="admin-responsive-grid" style={{ gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ តម្លៃ Flash Sale ($)</label>
              <input className="input-glass-admin" type="number" placeholder="តម្លៃ Flash Sale ($)" value={editFormData.flash_sale_price} onChange={e => setEditFormData({ ...editFormData, flash_sale_price: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.8 }}>⚡ ថ្ងៃបញ្ចប់ Flash Sale</label>
              <input className="input-glass-admin" type="datetime-local" value={editFormData.flash_sale_end} onChange={e => setEditFormData({ ...editFormData, flash_sale_end: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ការពណ៌នា</label>
            <textarea className="input-glass-admin" rows="3" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} placeholder="ការពណ៌នាចំណុចពិសេស..."></textarea>
          </div>

          <div className="admin-gallery-editor" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 800, opacity: 0.6 }}>ជំនួយរូបភាព (Gallery)</label>
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
                <span>+</span><label>ថែមរូប</label>
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
          <button className="nav-pill-btn btn-destructive" style={{ flex: 1, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={() => setEditingProduct(null)}>បោះបង់</button>
          <button className="nav-pill-btn" style={{ flex: 1, minHeight: 48, padding: '0 5px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid #e2e8f0' }} onClick={() => handlePreview(editFormData)}>👁️ មើលសិន</button>
          <button className="ticket-btn-primary" style={{ flex: 1.2, minHeight: 48, padding: '0 5px' }} disabled={isSaving} onClick={submitEditProduct}>
            {isSaving ? '⌛...' : 'រក្សាទុក'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AdminEditProductModal;
