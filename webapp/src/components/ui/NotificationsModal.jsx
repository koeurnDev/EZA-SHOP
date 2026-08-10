import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * 🔵 Facebook-Style Notifications Modal (Pixel-Perfect Clean UI)
 */
const NotificationsModal = ({ isOpen, onClose, lang = 'kh' }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [, setNow] = useState(Date.now());
  const isKhmer = !lang || lang === 'kh' || lang === 'km';

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      fetch(`${BACKEND_URL}/api/notifications`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const list = (data.notifications || []).map(item => ({
              ...item,
              is_read: false
            }));
            setNotifications(list);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      // ⏱️ Real-time ticker to auto-update timestamps (មុននេះបន្តិច -> 1 នាទីមុន -> 2 នាទីមុន)
      const timer = setInterval(() => {
        setNow(Date.now());
      }, 10000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      try { tg.HapticFeedback.impactOccurred('medium'); } catch (err) {}
    }

    setNotifications(prev => prev.filter(item => item.id !== id));
    setMenuOpenId(null);

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    fetch(`${BACKEND_URL}/api/notifications/${id}`, { method: 'DELETE' })
      .catch(console.error);
  };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    
    if (diffSec < 60) return isKhmer ? 'មុននេះបន្តិច' : 'Just now';
    if (diffSec < 3600) return isKhmer ? `${Math.floor(diffSec / 60)} នាទីមុន` : `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return isKhmer ? `${Math.floor(diffSec / 3600)} ម៉ោងមុន` : `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return createPortal(
    <div 
      className="vs-modal-overlay" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.75)', 
        backdropFilter: 'blur(10px)', 
        zIndex: 999999, 
        display: 'flex', 
        alignItems: 'center', 
        justify: 'center', 
        padding: '16px' 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          maxWidth: 460, 
          width: '100%', 
          maxHeight: '80vh', 
          height: 'fit-content',
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-surface)', 
          borderRadius: 24, 
          border: '1px solid var(--border-subtle)', 
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'modal-pop 0.25s cubic-bezier(0.165, 0.84, 0.44, 1) forwards'
        }} 
        onClick={e => { e.stopPropagation(); setMenuOpenId(null); }}
      >
        {/* Facebook Style Header */}
        <div style={{ 
          padding: '18px 20px 12px', 
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-bold)', margin: 0, letterSpacing: -0.3 }}>
              {isKhmer ? 'សារជូនដំណឹង' : 'Notifications'}
            </h2>
            <button 
              onClick={onClose} 
              style={{ 
                fontSize: 16, 
                opacity: 0.7, 
                border: 'none', 
                background: 'var(--bg-soft)', 
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                cursor: 'pointer', 
                color: 'var(--text-main)' 
              }}
            >
              ✕
            </button>
          </div>

          {/* Facebook Style Filter Tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'all' ? '#1877f2' : 'var(--bg-soft)',
                color: activeTab === 'all' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isKhmer ? 'ទាំងអស់' : 'All'}
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'unread' ? '#1877f2' : 'var(--bg-soft)',
                color: activeTab === 'unread' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {isKhmer ? 'មិនទាន់អាន' : 'Unread'}
            </button>
          </div>
        </div>
        
        {/* Facebook Style Content Item List */}
        <div style={{ padding: '8px', overflowY: 'auto', flexShrink: 1, WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>
              ⏳ {isKhmer ? 'កំពុងផ្ទុកសារ...' : 'Loading notifications...'}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredNotifications.map((item) => (
                <div 
                  key={item.id} 
                  style={{
                    padding: '12px 14px',
                    background: item.is_read ? 'transparent' : 'var(--bg-soft)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    position: 'relative',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {/* Facebook Circular Avatar Icon */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1877f2 0%, #0056b3 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      color: '#ffffff',
                      fontSize: 18,
                      boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)'
                    }}>
                      📢
                    </div>
                    {/* Active Unread Blue Dot */}
                    {!item.is_read && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#1877f2',
                        border: '2px solid var(--bg-surface)'
                      }} />
                    )}
                  </div>

                  {/* Notification Body Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bold)', lineHeight: 1.6, marginBottom: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                      {item.message || (isKhmer ? 'បានផ្ញើដំណឹងប្រូម៉ូសិនថ្មី!' : 'Sent a new promotion notice!')}
                    </div>

                    {/* Image Attachment Preview */}
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt=""
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginTop: 8, marginBottom: 6 }}
                        crossOrigin="anonymous"
                      />
                    )}

                    {/* Relative Timestamp */}
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1877f2' }}>
                      {getRelativeTime(item.created_at)}
                    </div>
                  </div>

                  {/* Facebook Style Action Menu (Three dots) */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(prev => (prev === item.id ? null : item.id));
                      }}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        border: 'none',
                        fontSize: 16,
                        fontWeight: 900,
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '50%'
                      }}
                    >
                      •••
                    </button>

                    {/* Action Dropdown Menu */}
                    {menuOpenId === item.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 28,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 14,
                          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                          zIndex: 20,
                          width: 'max-content',
                          padding: 6,
                          whiteSpace: 'nowrap'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span>🗑️</span>
                          <span>{isKhmer ? 'លុបដំណឹងនេះ' : 'Delete Notification'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 6 }}>
                {isKhmer ? 'មិនទាន់មានសារថ្មីទេ' : 'No notifications yet'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {isKhmer ? 'សារជូនដំណឹង និងប្រូម៉ូសិនពី Telegram នឹងបង្ហាញនៅទីនេះ' : 'Notifications and promotions will appear here'}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
