import React from 'react';
import { useUser } from '../../context/UserContext';

const AdminBroadcastTab = React.memo(({
  broadcastImage, broadcastMsg, setBroadcastMsg, isBroadcasting,
  handleBroadcast, handleBroadcastUpload, setBroadcastImage
}) => {
  const { t } = useUser();

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
      </div>
    </div>
  );
});

export default AdminBroadcastTab;
