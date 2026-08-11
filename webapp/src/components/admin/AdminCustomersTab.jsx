import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../context/TelegramContext';

const AdminCustomersTab = ({ BACKEND_URL }) => {
  const { initData, showAlert, showConfirm } = useTelegram();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/customers`, {
        headers: { 'X-TG-Data': initData || '' }
      });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleUpdateRole = async (userId, currentRole) => {
    const newRole = currentRole === 'staff' ? 'user' : 'staff';
    const msg = currentRole === 'staff' ? 'តើអ្នកចង់ទម្លាក់សិទ្ធិគាត់មកត្រឹម User ធម្មតាវិញទេ?' : 'តើអ្នកចង់ដំឡើងគាត់ជា Staff (Admin) ទេ?';
    
    showConfirm(msg, async (confirm) => {
      if (!confirm) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}/role`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-TG-Data': initData || '' },
          body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (data.success) {
          setCustomers(prev => prev.map(c => c.user_id === userId ? { ...c, role: newRole } : c));
          showAlert('ជោគជ័យ!');
        } else {
          showAlert(data.error || 'មានបញ្ហា');
        }
      } catch (err) {
        showAlert('មានបញ្ហាក្នុងការតភ្ជាប់');
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    showConfirm('តើអ្នកពិតជាចង់លុបអាខោននេះមែនទេ? (ប្រវត្តិការកម្ម៉ង់ទាំងអស់របស់គាត់ក៏នឹងត្រូវលុបចោលដែរ)', async (confirm) => {
      if (!confirm) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}`, {
          method: 'DELETE',
          headers: { 'X-TG-Data': initData || '' }
        });
        const data = await res.json();
        if (data.success) {
          setCustomers(prev => prev.filter(c => c.user_id !== userId));
          showAlert('លុបបានជោគជ័យ!');
        } else {
          showAlert(data.error || 'មានបញ្ហា');
        }
      } catch (err) {
        showAlert('មានបញ្ហាក្នុងការតភ្ជាប់');
      }
    });
  };

  const handleBanUser = async (userId, isCurrentlyBanned) => {
    showConfirm(isCurrentlyBanned ? 'តើអ្នកចង់បើកគណនីនេះវិញទេ?' : 'តើអ្នកពិតជាចង់ផ្អាកគណនីនេះមែនទេ?', async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}/ban`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-TG-Data': initData || '' 
          },
          body: JSON.stringify({ isBanned: !isCurrentlyBanned })
        });
        const data = await res.json();
        if (data.success) {
          setCustomers(prev => prev.map(c => c.user_id === userId ? { ...c, is_banned: !isCurrentlyBanned } : c));
          showAlert(isCurrentlyBanned ? 'បើកគណនីបានជោគជ័យ!' : 'ផ្អាកគណនីបានជោគជ័យ!');
        } else {
          showAlert(data.error || 'មានបញ្ហា');
        }
      } catch (err) {
        showAlert('មានបញ្ហាក្នុងការតភ្ជាប់');
      }
    });
  };

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    const nameMatch = c.user_name ? c.user_name.toLowerCase().includes(term) : false;
    const idMatch = String(c.user_id).includes(term);
    return nameMatch || idMatch;
  });

  return (
    <div className="tab-pane-animate">
      <div className="glass-card-luxury" style={{ marginBottom: 25, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>👥 អតិថិជន និង Staff</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-dim)' }}>{customers.length} នាក់</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ ឬ ID..." 
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-soft)',
              color: 'var(--text-main)',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>កំពុងទាញយក...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>រកមិនឃើញទេ</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredCustomers.map(user => (
              <div key={user.user_id} style={{ 
                background: 'var(--bg-soft)', 
                padding: 16, 
                borderRadius: 16, 
                display: 'flex', 
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 40, height: 40, 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16
                    }}>
                      {user.user_name ? user.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {user.user_name || `User ${String(user.user_id).slice(-4)}`}
                        {user.role === 'admin' && <span style={{ fontSize: 10, background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>Admin</span>}
                        {user.role === 'staff' && <span style={{ fontSize: 10, background: '#3b82f6', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>Staff</span>}
                        {user.is_banned && <span style={{ fontSize: 10, background: '#000', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>Banned 🚫</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: {user.user_id}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, background: 'var(--bg-surface)', padding: 10, borderRadius: 12 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Phone:</span> <br/>
                    <span style={{ fontWeight: 700, display: 'block', color: (user.phone && (user.phone.includes(':') || user.phone.length > 25)) ? 'var(--text-muted)' : 'inherit' }}>
                      {user.phone && (user.phone.includes(':') || user.phone.length > 25) ? '🔒 Protected' : (user.phone || '---')}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>Active:</span> <br/>
                    <span style={{ fontWeight: 700 }}>
                      {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : (user.last_updated ? new Date(user.last_updated).toLocaleDateString() : '---')}
                    </span>
                  </div>
                </div>

                {user.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                    <button 
                      onClick={() => handleUpdateRole(user.user_id, user.role)}
                      style={{ 
                        flex: 1, 
                        background: user.role === 'staff' ? 'var(--bg-surface)' : 'rgba(59, 130, 246, 0.12)', 
                        color: user.role === 'staff' ? 'var(--text-bold)' : '#2563eb', 
                        padding: '10px 4px', 
                        borderRadius: 12, 
                        fontSize: 11, 
                        fontWeight: 800,
                        border: user.role === 'staff' ? '1.5px solid var(--border-subtle)' : '1.5px solid rgba(59, 130, 246, 0.3)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}>
                      {user.role === 'staff' ? 'ទម្លាក់សិទ្ធិ' : '⭐ តម្លើង Staff'}
                    </button>
                    <button 
                      onClick={() => handleBanUser(user.user_id, user.is_banned)}
                      style={{ 
                        flex: 1, 
                        background: user.is_banned ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                        color: user.is_banned ? '#059669' : '#dc2626', 
                        padding: '10px 4px', 
                        borderRadius: 12, 
                        fontSize: 11, 
                        fontWeight: 800,
                        border: user.is_banned ? '1.5px solid rgba(16, 185, 129, 0.3)' : '1.5px solid rgba(239, 68, 68, 0.3)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}>
                      {user.is_banned ? '🟢 បើកគណនី' : '🚫 ផ្អាកគណនី'}
                    </button>
                  </div>
                )}
                
                {user.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                    <button 
                      onClick={() => handleDeleteUser(user.user_id)}
                      style={{ 
                        flex: 1, 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        color: '#dc2626', 
                        padding: '10px', 
                        borderRadius: 12, 
                        fontSize: 12, 
                        fontWeight: 800,
                        border: '1.5px solid rgba(239, 68, 68, 0.2)',
                        cursor: 'pointer'
                      }}>
                      🗑️ លុប
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersTab;
