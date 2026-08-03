import React from 'react';

const AdminFaqModal = React.memo(({ isFaqModalOpen, editingFaq, setEditingFaq, setIsFaqModalOpen, handleSaveFaq }) => {
  if (!isFaqModalOpen) return null;

  return (
    <div className="admin-dashboard-overhaul" style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'var(--bg-soft)' }}>
      <div className="glass-card-luxury" style={{ width: '92%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h3 style={{ marginBottom: 20, flexShrink: 0 }}>{editingFaq?.id ? '✏️ កែប្រែ FAQ' : '➕ បន្ថែម FAQ'}</h3>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 5, paddingBottom: 5, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>សំណួរ (ភាសាខ្មែរ)</label>
            <input className="input-glass-admin" value={editingFaq?.q_kh || ''} onChange={e => setEditingFaq({ ...editingFaq, q_kh: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>សំណួរ (English)</label>
            <input className="input-glass-admin" value={editingFaq?.q_en || ''} onChange={e => setEditingFaq({ ...editingFaq, q_en: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ចម្លើយ (ភាសាខ្មែរ)</label>
            <textarea className="input-glass-admin" rows="3" value={editingFaq?.a_kh || ''} onChange={e => setEditingFaq({ ...editingFaq, a_kh: e.target.value })}></textarea>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>ចម្លើយ (English)</label>
            <textarea className="input-glass-admin" rows="3" value={editingFaq?.a_en || ''} onChange={e => setEditingFaq({ ...editingFaq, a_en: e.target.value })}></textarea>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>លំដាប់លំដោយ (Sort Order)</label>
            <input type="number" className="input-glass-admin" value={editingFaq?.sort_order || 0} onChange={e => setEditingFaq({ ...editingFaq, sort_order: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexShrink: 0 }}>
          <button className="nav-pill-btn btn-destructive" style={{ flex: 1 }} onClick={() => setIsFaqModalOpen(false)}>បោះបង់</button>
          <button className="ticket-btn-primary" style={{ flex: 1.5 }} onClick={handleSaveFaq}>រក្សាទុក</button>
        </div>
      </div>
    </div>
  );
});

export default AdminFaqModal;
