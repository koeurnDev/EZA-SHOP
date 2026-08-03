import React from 'react';

const AdminFaqsTab = React.memo(({ faqsLoading, faqsList, setEditingFaq, setIsFaqModalOpen, handleDeleteFaq }) => (
  <div className="tab-pane-animate">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 900 }}>គ្រប់គ្រងសំណួរ-ចម្លើយ</h3>
        <button
          className="ticket-btn-primary"
          style={{ flex: 'none', width: 'auto', padding: '10px 20px', height: 'auto' }}
          onClick={() => {
            setEditingFaq({ id: null, q_kh: '', q_en: '', a_kh: '', a_en: '', sort_order: 0, is_active: true });
            setIsFaqModalOpen(true);
          }}
        >
          ➕ បន្ថែមថ្មី
        </button>
      </div>

      {faqsLoading ? (
        <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>កំពុងទាញទិន្នន័យ...</div>
      ) : faqsList.length === 0 ? (
        <div className="glass-card-luxury" style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>មិនមានទិន្នន័យទេ</div>
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
                កែប្រែ
              </button>
              <button
                className="nav-pill-btn btn-destructive"
                style={{ padding: '8px 24px', flex: 'none', minWidth: 'auto' }}
                onClick={() => handleDeleteFaq(faq.id)}
              >
                លុប
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
));

export default AdminFaqsTab;
