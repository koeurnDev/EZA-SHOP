import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './NotificationsModal.css';

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

const NotificationsModal = ({ isOpen, onClose, lang = 'kh' }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
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

      const timer = setInterval(() => setNow(Date.now()), 10000);
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
    fetch(`${BACKEND_URL}/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {});
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
    <div className="notif-modal-overlay animate-in" onClick={onClose}>
      <div className="notif-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="notif-modal-header">
          <div className="notif-modal-title-row">
            <div className="notif-modal-brand">
              <div className="notif-modal-icon">🔔</div>
              <h2 className="notif-modal-title">
                {isKhmer ? 'សារជូនដំណឹង' : 'Notifications'}
              </h2>
              {unreadCount > 0 && (
                <span className="notif-modal-badge">
                  {unreadCount} {isKhmer ? 'ថ្មី' : 'New'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {notifications.length > 0 && (
                <button type="button" onClick={handleClearAll} className="notif-modal-clear" title={isKhmer ? 'សម្អាតទាំងអស់' : 'Clear All'}>
                  <span>🗑️</span>
                  <span>{isKhmer ? 'សម្អាត' : 'Clear'}</span>
                </button>
              )}
              <button type="button" onClick={onClose} className="notif-modal-close" aria-label="Close">✕</button>
            </div>
          </div>

          <div className="notif-modal-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`notif-modal-tab${activeTab === 'all' ? ' active' : ''}`}
            >
              {isKhmer ? `ទាំងអស់ (${notifications.length})` : `All (${notifications.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`notif-modal-tab${activeTab === 'unread' ? ' active' : ''}`}
            >
              {isKhmer ? `មិនទាន់អាន (${unreadCount})` : `Unread (${unreadCount})`}
            </button>
          </div>
        </div>

        <div className="notif-modal-body">
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
                  className={`notif-item${item.is_read ? '' : ' unread'}`}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="notif-item-icon">📢</div>
                    {!item.is_read && <div className="notif-item-dot" />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="notif-item-text">
                      {item.message || (isKhmer ? 'បានផ្ញើដំណឹងប្រូម៉ូសិនថ្មី!' : 'Sent a new promotion notice!')}
                    </div>

                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt=""
                        style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 14, marginTop: 8, marginBottom: 6, border: '1px solid var(--border-subtle)' }}
                        loading="lazy"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                      />
                    )}

                    <div className="notif-item-time">
                      <span>⏱️</span>
                      <span>{getRelativeTime(item.created_at)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="notif-item-delete"
                    title={isKhmer ? 'លុប' : 'Delete'}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div className="notif-empty-icon">✨</div>
              <div className="notif-empty-title">
                {isKhmer ? 'គ្មានសារជូនដំណឹងទេ' : 'All Caught Up!'}
              </div>
              <div className="notif-empty-sub">
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
