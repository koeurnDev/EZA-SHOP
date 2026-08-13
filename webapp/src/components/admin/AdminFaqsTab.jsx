import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminFaqsTab = React.memo(({ faqsLoading, faqsList, setEditingFaq, setIsFaqModalOpen, handleDeleteFaq }) => {
  const { t } = useUser();
  return (
  <div className="tab-pane-animate">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900 }}>{t('admin_faq_title')}</h3>
        <button
          type="button"
          className="admin-products-add-btn"
          onClick={() => {
            setEditingFaq({ id: null, q_kh: '', q_en: '', a_kh: '', a_en: '', sort_order: 0, is_active: true });
            setIsFaqModalOpen(true);
          }}
        >
          + {t('admin_add_faq')}
        </button>
      </div>

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
