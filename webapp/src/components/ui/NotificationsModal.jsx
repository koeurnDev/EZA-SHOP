import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const LOCAL_STORAGE_CLEARED_KEY = 'momo_cleared_notifications';
const LOCAL_STORAGE_READ_KEY = 'momo_read_notifications';

const getClearedIds = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLEARED_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

const saveClearedId = (id) => {
  try {
    const list = getClearedIds();
    if (!list.includes(String(id))) {
      list.push(String(id));
      localStorage.setItem(LOCAL_STORAGE_CLEARED_KEY, JSON.stringify(list));
    }
  } catch (e) {}
};

const saveClearedAll = (ids) => {
  try {
    const list = getClearedIds();
    ids.forEach(id => {
      if (!list.includes(String(id))) list.push(String(id));
    });
    localStorage.setItem(LOCAL_STORAGE_CLEARED_KEY, JSON.stringify(list));
  } catch (e) {}
};

const getReadIds = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_READ_KEY) || '[]');
  } catch (e) {
    return [];
  }
};

const saveReadId = (id) => {
  try {
    const list = getReadIds();
    if (!list.includes(String(id))) {
      list.push(String(id));
      localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(list));
    }
  } catch (e) {}
};

/**
 * 🌟 Ultra-Luxury Notifications Modal (Theme Adaptive & Brand Gradient Colors)
 */
const NotificationsModal = ({ isOpen, onClose, lang = 'kh' }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
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
            const cleared = getClearedIds();
            const read = getReadIds();
            const filtered = (data.notifications || [])
              .filter(item => !cleared.includes(String(item.id)))
              .map(item => ({
                ...item,
                is_read: read.includes(String(item.id))
              }));
            setNotifications(filtered);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));

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

    saveClearedId(id);
    setNotifications(prev => prev.filter(item => String(item.id) !== String(id)));

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    fetch(`${BACKEND_URL}/api/notifications/${id}`, { method: 'DELETE' })
      .catch(() => {});
  };

  const handleClearAll = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      try { tg.HapticFeedback.notificationOccurred('success'); } catch (err) {}
    }

    const allIds = notifications.map(n => String(n.id));
    saveClearedAll(allIds);
    setNotifications([]);
  };

  const handleItemClick = (id) => {
    saveReadId(id);
    setNotifications(prev => prev.map(item => String(item.id) === String(id) ? { ...item, is_read: true } : item));
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

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return createPortal(
    <div 
      className="vs-modal-overlay animate-in" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.65)', 
        backdropFilter: 'blur(16px)', 
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 999999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '16px' 
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          maxWidth: 440, 
          width: '100%', 
          maxHeight: '82vh', 
          height: 'fit-content',
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-surface)', 
          color: 'var(--text-main)',
          borderRadius: 28, 
          border: '1px solid var(--border-subtle)', 
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'modal-pop 0.25s cubic-bezier(0.165, 0.84, 0.44, 1) forwards'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Brand Theme Header */}
        <div style={{ 
          padding: '20px 22px 14px', 
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'var(--primary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                lineHeight: 1,
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(255, 114, 160, 0.35)'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>🔔</span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-bold)', margin: 0, letterSpacing: -0.3 }}>
                {isKhmer ? 'សារជូនដំណឹង' : 'Notifications'}
              </h2>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--primary-gradient)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: 20,
                  boxShadow: '0 2px 8px rgba(255, 114, 160, 0.4)'
                }}>
                  {unreadCount} {isKhmer ? 'ថ្មី' : 'New'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    padding: '5px 12px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.2s ease'
                  }}
                  title={isKhmer ? 'សម្អាតទាំងអស់' : 'Clear All'}
                >
                  <span>🗑️</span>
                  <span>{isKhmer ? 'សម្អាត' : 'Clear'}</span>
                </button>
              )}
              <button 
                onClick={onClose} 
                style={{ 
                  fontSize: 15, 
                  border: 'none', 
                  background: 'var(--bg-soft)', 
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer', 
                  color: 'var(--text-main)',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Segmented Filter Tabs */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-soft)', 
            padding: 4, 
            borderRadius: 16,
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'all' ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === 'all' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === 'all' ? '0 4px 12px rgba(255, 114, 160, 0.3)' : 'none'
              }}
            >
              {isKhmer ? `ទាំងអស់ (${notifications.length})` : `All (${notifications.length})`}
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                border: 'none',
                background: activeTab === 'unread' ? 'var(--primary-gradient)' : 'transparent',
                color: activeTab === 'unread' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: activeTab === 'unread' ? '0 4px 12px rgba(255, 114, 160, 0.3)' : 'none'
              }}
            >
              {isKhmer ? `មិនទាន់អាន (${unreadCount})` : `Unread (${unreadCount})`}
            </button>
          </div>
        </div>
        
        {/* Content Item List */}
        <div style={{ padding: 12, overflowY: 'auto', flexShrink: 1, WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>
              ⌛ {isKhmer ? 'កំពុងផ្ទុកសារ...' : 'Loading notifications...'}
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredNotifications.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    padding: '14px 16px',
                    background: item.is_read ? 'transparent' : 'rgba(255, 114, 160, 0.07)',
                    borderRadius: 18,
                    border: item.is_read ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 114, 160, 0.3)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: item.is_read ? 'none' : '0 4px 14px rgba(255, 114, 160, 0.1)'
                  }}
                >
                  {/* Dynamic Icon Bubble */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: item.is_read ? 'var(--bg-soft)' : 'var(--primary-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: item.is_read ? 'var(--text-muted)' : '#ffffff',
                      fontSize: 19,
                      lineHeight: 1,
                      boxShadow: item.is_read ? 'none' : '0 4px 12px rgba(255, 114, 160, 0.35)'
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>📢</span>
                    </div>
                    {/* Pulsing Unread Indicator */}
                    {!item.is_read && (
                      <div style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: '#ec4899',
                        border: '2px solid var(--bg-surface)',
                        boxShadow: '0 0 8px #ec4899'
                      }} />
                    )}
                  </div>

                  {/* Notification Body Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: item.is_read ? 600 : 800, color: 'var(--text-bold)', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {item.message || (isKhmer ? 'បានផ្ញើដំណឹងប្រូម៉ូសិនថ្មី!' : 'Sent a new promotion notice!')}
                    </div>

                    {/* Image Attachment Preview */}
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt=""
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14, marginTop: 8, marginBottom: 6, border: '1px solid var(--border-subtle)' }}
                        crossOrigin="anonymous"
                      />
                    )}

                    {/* Relative Timestamp */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: item.is_read ? 'var(--text-muted)' : '#ec4899', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>⏱️</span>
                      <span>{getRelativeTime(item.created_at)}</span>
                    </div>
                  </div>

                  {/* Direct Delete Button */}
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    style={{
                      background: 'var(--bg-soft)',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 10,
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 13,
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                    title={isKhmer ? 'លុប' : 'Delete'}
                  >
                    🗑️
                  </button>

                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                background: 'var(--bg-soft)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 32, 
                lineHeight: 1,
                margin: '0 auto 16px',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✨</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 6 }}>
                {isKhmer ? 'គ្មានសារជូនដំណឹងទេ' : 'All Caught Up!'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
                {isKhmer ? 'សារចាស់ៗត្រូវបានសម្អាត។ ដំណឹងថ្មីៗ និងប្រូម៉ូសិនពិសេសនឹងបង្ហាញនៅទីនេះ ពេលមានការអាប់ដេត។' : 'Old notifications cleared. New updates and promo deals will appear here when available.'}
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
