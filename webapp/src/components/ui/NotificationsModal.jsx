import React from 'react';
import { createPortal } from 'react-dom';

const NotificationsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="vs-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="glass-card-luxury" style={{ maxWidth: 400, width: '90%', padding: 24, background: 'var(--bg-card)', borderRadius: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>🔔 សារពីប្រព័ន្ធ</h2>
          <button onClick={onClose} style={{ fontSize: 20, opacity: 0.5 }}>✕</button>
        </div>
        
        <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.5 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>មិនទាន់មានសារថ្មីទេ</div>
          <div style={{ fontSize: 12 }}>សារជូនដំណឹង និងប្រូម៉ូសិននឹងបង្ហាញនៅទីនេះ</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
