import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminFaqsTab = React.memo(({ faqsLoading, faqsList, editingFaq, setEditingFaq, isFaqModalOpen, setIsFaqModalOpen, handleDeleteFaq, handleSaveFaq }) => {
  const { t } = useUser();
  return (
  <div className="tab-pane-animate admin-coupons-tab">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="admin-coupons-head" style={{ marginBottom: 0 }}>
        <h3 className="admin-coupons-title">{t('admin_faq_title')}</h3>
        <button
          type="button"
          className={isFaqModalOpen ? 'admin-products-scan-btn' : 'admin-products-add-btn'}
          onClick={() => {
            if (isFaqModalOpen) {
              setIsFaqModalOpen(false);
            } else {
              setEditingFaq({ id: null, q_kh: '', q_en: '', a_kh: '', a_en: '', sort_order: 0, is_active: true });
              setIsFaqModalOpen(true);
            }
          }}
        >
          {isFaqModalOpen ? 'បោះបង់' : `+ ${t('admin_add_faq')}`}
        </button>
      </div>

      {isFaqModalOpen && (
        <form onSubmit={(e) => { e.preventDefault(); handleSaveFaq(); }} className="admin-coupon-form">
          <div className="admin-coupon-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">សំណួរ (ភាសាខ្មែរ)</label>
              <input
                className="input-glass-admin admin-form-input"
                value={editingFaq?.q_kh || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, q_kh: e.target.value })}
                placeholder="ឧ. តើដឹកជញ្ជូនត្រូវប៉ុន្មានថ្ងៃ?"
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">សំណួរ (English)</label>
              <input
                className="input-glass-admin admin-form-input"
                value={editingFaq?.q_en || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, q_en: e.target.value })}
                placeholder="e.g. How long is delivery?"
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ចម្លើយ (ភាសាខ្មែរ)</label>
              <textarea
                className="input-glass-admin admin-form-input"
                rows="3"
                value={editingFaq?.a_kh || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, a_kh: e.target.value })}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ចម្លើយ (English)</label>
              <textarea
                className="input-glass-admin admin-form-input"
                rows="3"
                value={editingFaq?.a_en || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, a_en: e.target.value })}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">លំដាប់ (Sort Order)</label>
              <input
                type="number"
                min="0"
                step="1"
                className="input-glass-admin admin-form-input"
                value={editingFaq?.sort_order ?? 0}
                onChange={(e) => setEditingFaq({
                  ...editingFaq,
                  sort_order: Number.isFinite(parseInt(e.target.value, 10)) ? parseInt(e.target.value, 10) : 0
                })}
              />
            </div>
          </div>
          <button type="submit" className="admin-broadcast-send-btn">
            {t('admin_save')}
          </button>
        </form>
      )}

      {faqsLoading ? (
        <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>{t('admin_fetching')}</div>
      ) : faqsList.length === 0 ? (
        <div className="glass-card-luxury" style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>{t('admin_no_data')}</div>
      ) : (
        faqsList.map(faq => (
          <div key={faq.id} className="glass-card-luxury" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{faq.q_kh}</div>
              <div style={{ opacity: 0.7, fontSize: 13, marginBottom: 10 }}>{faq.a_kh}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>{faq.q_en}</div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{faq.a_en}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <button
                className="nav-pill-btn"
                style={{ padding: '8px 24px', background: 'var(--bg-surface)', color: 'var(--text-main)', flex: 'none', minWidth: 'auto' }}
                onClick={() => { setEditingFaq(faq); setIsFaqModalOpen(true); }}
              >
                {t('admin_edit')}
              </button>
              <button
                className="nav-pill-btn btn-destructive"
                style={{ padding: '8px 24px', flex: 'none', minWidth: 'auto' }}
                onClick={() => handleDeleteFaq(faq.id)}
              >
                {t('admin_delete')}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
});

export default AdminFaqsTab;
