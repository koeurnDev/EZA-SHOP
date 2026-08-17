import React from 'react';
import { useUser } from '../../../context/UserContext';

const AdminFaqModal = React.memo(({
  isFaqModalOpen, editingFaq, setEditingFaq, setIsFaqModalOpen, handleSaveFaq
}) => {
  const { t } = useUser();
  if (!isFaqModalOpen || !editingFaq) return null;

  return (
    <div 
      className="admin-dashboard-overhaul admin-product-modal-overlay"
      style={{ zIndex: 9999, alignItems: 'flex-end', padding: 0 }}
    >
      <div 
        className="admin-product-modal-sheet"
        style={{ 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          width: '100%',
          margin: 0
        }}
      >
        <h3 className="admin-product-modal-header">
          {editingFaq.id ? t('admin_edit') : t('admin_add_faq')}
        </h3>

        <div className="admin-product-modal-body">
          <div>
            <label className="admin-form-label">សំណួរ (ភាសាខ្មែរ)</label>
            <input
              className="input-glass-admin"
              value={editingFaq.q_kh || ''}
              onChange={(e) => setEditingFaq({ ...editingFaq, q_kh: e.target.value })}
              placeholder="ឧ. តើដឹកជញ្ជូនត្រូវប៉ុន្មានថ្ងៃ?"
            />
          </div>
          <div>
            <label className="admin-form-label">សំណួរ (English)</label>
            <input
              className="input-glass-admin"
              value={editingFaq.q_en || ''}
              onChange={(e) => setEditingFaq({ ...editingFaq, q_en: e.target.value })}
              placeholder="e.g. How long is delivery?"
            />
          </div>
          <div>
            <label className="admin-form-label">ចម្លើយ (ភាសាខ្មែរ)</label>
            <textarea
              className="input-glass-admin"
              rows="3"
              value={editingFaq.a_kh || ''}
              onChange={(e) => setEditingFaq({ ...editingFaq, a_kh: e.target.value })}
            />
          </div>
          <div>
            <label className="admin-form-label">ចម្លើយ (English)</label>
            <textarea
              className="input-glass-admin"
              rows="3"
              value={editingFaq.a_en || ''}
              onChange={(e) => setEditingFaq({ ...editingFaq, a_en: e.target.value })}
            />
          </div>
          <div>
            <label className="admin-form-label">លំដាប់ (Sort Order)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input-glass-admin admin-form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={editingFaq.sort_order ?? 0}
              onChange={(e) => setEditingFaq({
                ...editingFaq,
                sort_order: Number.isFinite(parseInt(e.target.value, 10)) ? parseInt(e.target.value, 10) : 0
              })}
            />
          </div>
        </div>

        <div className="admin-product-modal-footer" style={{ paddingBottom: 16 }}>
          <button
            type="button"
            className="nav-pill-btn btn-destructive"
            style={{ flex: 1 }}
            onClick={() => setIsFaqModalOpen(false)}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="ticket-btn-primary"
            style={{ flex: 1.2 }}
            onClick={handleSaveFaq}
          >
            {t('admin_save')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AdminFaqModal;
