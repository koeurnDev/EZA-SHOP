import React from 'react';
import { createPortal } from 'react-dom';

const NotificationsModal = ({ isOpen, onClose, lang = 'kh' }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="vs-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div className="glass-card-luxury" style={{ maxWidth: 400, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', borderRadius: 24, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-hover)' }} onClick={e => e.stopPropagation()}>
        
        {/* Header - Fixed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-bold)', margin: 0 }}>🔔 {lang === 'kh' ? 'សារពីប្រព័ន្ធ' : 'System Messages'}</h2>
          <button onClick={onClose} style={{ fontSize: 20, opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-main)' }}>✕</button>
        </div>
        
        {/* Content - Scrollable */}
        <div style={{ padding: '40px 24px', textAlign: 'center', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          <div style={{ opacity: 0.8 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>{lang === 'kh' ? 'មិនទាន់មានសារថ្មីទេ' : 'No new messages yet'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lang === 'kh' ? 'សារជូនដំណឹង និងប្រូម៉ូសិននឹងបង្ហាញនៅទីនេះ' : 'Notifications and promotions will appear here'}</div>
          </div>
          
          {/* Example of how multiple items would render without breaking layout */}
          {/* 
            {Array(10).fill(0).map((_, i) => (
              <div key={i} style={{ padding: 15, background: 'var(--bg-soft)', borderRadius: 12, marginTop: 12, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-bold)' }}>ប្រូម៉ូសិនពិសេស #{i+1}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>ទទួលបានការបញ្ចុះតម្លៃ ៥០% សម្រាប់អតិថិជនដំបូង!</div>
              </div>
            ))} 
          */}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
