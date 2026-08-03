import React from 'react';

const AdminBroadcastTab = React.memo(({ broadcastImage, broadcastMsg, setBroadcastMsg, isBroadcasting, handleBroadcast, handleBroadcastUpload }) => (
  <div className="tab-pane-animate">
    <div className="glass-card-luxury">
      <div style={{ textAlign: 'center', marginBottom: 25 }}>
        <div style={{ fontSize: 40 }}>📢</div>
        <h3 style={{ margin: '10px 0', fontSize: 18, fontWeight: 950 }}>ផ្សាយដំណឹង</h3>
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 800, marginBottom: 8, opacity: 0.6 }}>រូបភាពបដា</label>
        <label className="upload-zone-luxury">
          {broadcastImage ? (
            <img src={broadcastImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
          ) : (
            <div className="upload-label-content">
              <div style={{ fontSize: 24 }}>📸</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>ចុចដាក់រូបភាព</div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>PNG, JPG (Max 5MB)</div>
            </div>
          )}
          <input type="file" accept="image/*" onChange={async e => {
            const file = e.target.files?.[0];
            if (file) handleBroadcastUpload(file);
          }} />
        </label>
      </div>
      <textarea
        className="input-glass-admin"
        rows="4"
        style={{ marginBottom: 20 }}
        value={broadcastMsg}
        onChange={e => setBroadcastMsg(e.target.value)}
        placeholder="សរសេរសារដំណឹង..."
      />
      <button className="ticket-btn-primary" onClick={handleBroadcast} disabled={isBroadcasting}>
        {isBroadcasting ? '⌛ កំពុងផ្ញើ...' : '🚀 ផ្ញើដំណឹងឥឡូវនេះ'}
      </button>
    </div>
  </div>
));

export default AdminBroadcastTab;
