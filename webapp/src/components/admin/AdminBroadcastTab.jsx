import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminBroadcastTab = React.memo(({
  broadcastImage, broadcastMsg, setBroadcastMsg, isBroadcasting,
  handleBroadcast, handleBroadcastUpload, setBroadcastImage
}) => {
  const { t, lang } = useUser();

  return (
    <div className="tab-pane-animate">
      <div className="glass-card-luxury admin-broadcast-card">
        <div className="admin-broadcast-header">
          <h3 className="admin-broadcast-title">{t('admin_broadcast_title')}</h3>
          <p className="admin-broadcast-subtitle">{t('admin_broadcast_desc')}</p>
        </div>

        <div className="admin-broadcast-field">
          <label className="admin-form-label">{t('admin_broadcast_image')}</label>
          <label className="upload-zone-luxury admin-broadcast-upload">
            {broadcastImage ? (
              <img src={broadcastImage} className="admin-broadcast-preview" alt="" crossOrigin="anonymous" />
            ) : (
              <div className="upload-label-content">
                <div className="admin-broadcast-upload-title">{t('admin_broadcast_upload')}</div>
                <div className="admin-broadcast-upload-hint">PNG, JPG (Max 5MB)</div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) handleBroadcastUpload(file);
              }}
            />
          </label>
          {broadcastImage && setBroadcastImage && (
            <button
              type="button"
              className="admin-broadcast-clear-image"
              onClick={() => setBroadcastImage('')}
            >
              {t('search_clear') || 'លុបរូប'}
            </button>
          )}
        </div>

        <div className="admin-broadcast-field">
          <label className="admin-form-label">{t('admin_broadcast_message') || 'សារប្រកាស'}</label>
          <textarea
            className="input-glass-admin admin-broadcast-textarea"
            rows="5"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            placeholder={t('admin_broadcast_placeholder')}
          />
        </div>

        <button
          type="button"
          className="admin-broadcast-send-btn"
          onClick={handleBroadcast}
          disabled={isBroadcasting || !broadcastMsg.trim()}
        >
          {isBroadcasting ? t('admin_broadcast_sending') : t('admin_send_msg')}
        </button>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <h3 className="admin-broadcast-title" style={{ fontSize: 16 }}>🛒 {lang === 'kh' ? 'រំលឹកភ្ញៀវភ្លេចកន្ត្រក (Abandoned Cart)' : 'Abandoned Cart Recovery'}</h3>
          <p className="admin-broadcast-subtitle" style={{ fontSize: 13 }}>{lang === 'kh' ? 'ផ្ញើសាររំលឹកទៅភ្ញៀវដែលមានទំនិញក្នុងកន្ត្រកលើសពី ២ម៉ោង។' : 'Send reminders to users who have items in cart for > 2 hours.'}</p>
          <button
            type="button"
            className="admin-broadcast-send-btn"
            style={{ marginTop: 15, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }}
            onClick={async () => {
              if (!window.confirm(lang === 'kh' ? 'តើអ្នកពិតជាចង់ផ្ញើសាររំលឹកនេះមែនទេ?' : 'Trigger abandoned cart reminders?')) return;
              try {
                const tgInitData = window.Telegram?.WebApp?.initData || '';
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/abandoned-cart-notify`, {
                  method: 'POST',
                  headers: { 'X-TG-Data': tgInitData, 'X-Debug-Bypass': 'true' }
                });
                const data = await res.json();
                if (data.success) {
                  alert(`✅ បានផ្ញើសាររំលឹកទៅកាន់ភ្ញៀវចំនួន ${data.count} នាក់!`);
                } else {
                  alert(`❌ បរាជ័យ: ${data.error}`);
                }
              } catch (e) {
                alert(`❌ បរាជ័យ: ${e.message}`);
              }
            }}
          >
            {lang === 'kh' ? 'ផ្ញើសាររំលឹកឥឡូវនេះ 🚀' : 'Send Reminders Now 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default AdminBroadcastTab;
