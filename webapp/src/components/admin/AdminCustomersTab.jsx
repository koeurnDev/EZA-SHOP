import React, { useState, useEffect } from 'react';
import { useTelegram } from '../../context/TelegramContext';
import UserAvatar from '../ui/UserAvatar';
import { getHeaders } from '../../utils/apiHelpers';

const formatCustomerActive = (user) => {
  if (user.last_seen) {
    const diff = Date.now() - new Date(user.last_seen).getTime();
    if (diff < 5 * 60 * 1000) {
      return { text: '🟢 Online ឥឡូវនេះ', online: true };
    }
    const d = new Date(user.last_seen);
    return {
      text: d.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }),
      online: false
    };
  }
  if (user.last_updated) {
    return { text: new Date(user.last_updated).toLocaleDateString('en-GB'), online: false };
  }
  return { text: '---', online: false };
};

const AdminCustomersTab = ({ BACKEND_URL }) => {
  const { initData, showAlert, showConfirm } = useTelegram();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/admin/customers`, {
        headers: getHeaders(BACKEND_URL, initData)
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

  useEffect(() => {
    if (openMenu === null) return;
    const handleClickOutside = () => setOpenMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openMenu]);

  const isValidId = (id) => id && String(id) !== 'null' && String(id) !== 'undefined' && !isNaN(Number(id)) && Number(id) > 0;

  const handleUpdateRole = async (userId, currentRole) => {
    if (!isValidId(userId)) return showAlert('មិនមាន ID ត្រឹមត្រូវសម្រាប់ធ្វើសកម្មភាពនេះទេ!');
    const newRole = currentRole === 'staff' ? 'user' : 'staff';
    const msg = currentRole === 'staff' ? 'តើអ្នកចង់ទម្លាក់សិទ្ធិគាត់មកត្រឹម User ធម្មតាវិញទេ?' : 'តើអ្នកចង់ដំឡើងគាត់ជា Staff (Admin) ទេ?';
    
    showConfirm(msg, async (confirm) => {
      if (!confirm) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}/role`, {
          method: 'PUT',
          headers: getHeaders(BACKEND_URL, initData, { 'Content-Type': 'application/json' }),
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
    if (!isValidId(userId)) return showAlert('មិនមាន ID ត្រឹមត្រូវសម្រាប់ធ្វើសកម្មភាពនេះទេ!');
    const target = customers.find(c => c.user_id === userId);
    if (target && target.role === 'admin') {
      return showAlert('មិនអាចលុបគណនី Admin បានទេ!');
    }
    showConfirm('តើអ្នកពិតជាចង់លុបអាខោននេះមែនទេ? (ប្រវត្តិការកម្ម៉ង់ទាំងអស់របស់គាត់ក៏នឹងត្រូវលុបចោលដែរ)', async (confirm) => {
      if (!confirm) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}`, {
          method: 'DELETE',
          headers: getHeaders(BACKEND_URL, initData)
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
    if (!isValidId(userId)) return showAlert('មិនមាន ID ត្រឹមត្រូវសម្រាប់ធ្វើសកម្មភាពនេះទេ!');
    showConfirm(isCurrentlyBanned ? 'តើអ្នកចង់បើកគណនីនេះវិញទេ?' : 'តើអ្នកពិតជាចង់ផ្អាកគណនីនេះមែនទេ?', async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        const res = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}/ban`, {
          method: 'PUT',
          headers: getHeaders(BACKEND_URL, initData, { 'Content-Type': 'application/json' }),
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
    if (!isValidId(c.user_id)) return false;
    const term = searchTerm.toLowerCase();
    const nameMatch = c.user_name ? c.user_name.toLowerCase().includes(term) : false;
    const idMatch = String(c.user_id).includes(term);
    return nameMatch || idMatch;
  });

  return (
    <div className="tab-pane-animate">
      <div className="glass-card-luxury" style={{ marginBottom: 25, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>👥 អតិថិជន និង Staff</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-dim)' }}>
            {searchTerm ? `${filteredCustomers.length} / ${customers.length}` : customers.length} នាក់
          </div>
        </div>

        <div style={{ marginBottom: 20, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="ស្វែងរកតាមឈ្មោះ ឬ ID..." 
            style={{
              width: '100%',
              padding: '12px 38px 12px 16px',
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
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 900, padding: 4 }}
            >
              ✖
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>កំពុងទាញយក...</div>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>រកមិនឃើញទេ</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredCustomers.map(user => {
              const isExpanded = expandedUser === user.user_id;
              const active = formatCustomerActive(user);
              return (
                <div 
                  key={user.user_id} 
                  style={{ 
                    background: 'var(--bg-soft)', 
                    padding: 12, 
                    borderRadius: 14, 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: isExpanded ? 10 : 0,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    border: isExpanded ? '1px solid var(--border-subtle)' : '1px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Clickable Header Area (Toggles expand/collapse details) */}
                    <div 
                      onClick={() => setExpandedUser(isExpanded ? null : user.user_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer', minWidth: 0 }}
                    >
                      <UserAvatar user={user} backendUrl={BACKEND_URL} initData={initData} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: 13, 
                          fontWeight: 800, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 5, 
                          flexWrap: 'nowrap',
                          overflow: 'hidden'
                        }}>
                          <span style={{ 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            maxWidth: '120px'
                          }}>
                            {user.user_name || `User ${String(user.user_id).slice(-4)}`}
                          </span>
                          {user.username && <span style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>@{user.username}</span>}
                          {user.role === 'admin' && <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', padding: '2px 5px', borderRadius: 8, flexShrink: 0 }}>Admin</span>}
                          {user.role === 'staff' && <span style={{ fontSize: 9, background: '#3b82f6', color: '#fff', padding: '2px 5px', borderRadius: 8, flexShrink: 0 }}>Staff</span>}
                          {user.is_banned && <span style={{ fontSize: 9, background: '#000', color: '#fff', padding: '2px 5px', borderRadius: 8, flexShrink: 0 }}>🚫</span>}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>ID: {user.user_id || '---'}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px', transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                    </div>

                    {/* 3-dots Action Menu Button */}
                    {user.role !== 'admin' && (
                      <div style={{ position: 'relative', zIndex: openMenu === user.user_id ? 500 : 1, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="icon-btn-admin" 
                          style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, padding: 0 }}
                          aria-label="Options" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setOpenMenu(openMenu === user.user_id ? null : user.user_id); 
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>

                        {openMenu === user.user_id && (
                          <div className="dropdown-menu-animate" style={{ position: 'absolute', right: 0, top: 42, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 6, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 12px 32px rgba(0,0,0,0.35)', minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              style={{ background: 'transparent', border: 'none', color: user.role === 'staff' ? 'var(--text-main)' : '#2563eb', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left' }}
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(null); handleUpdateRole(user.user_id, user.role); }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {user.role === 'staff' ? '🔻 ទម្លាក់សិទ្ធិ' : '⭐ តម្លើង Staff'}
                            </button>

                            <button 
                              style={{ background: 'transparent', border: 'none', color: user.is_banned ? '#059669' : '#dc2626', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left' }}
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(null); handleBanUser(user.user_id, user.is_banned); }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {user.is_banned ? '🟢 បើកគណនី' : '🚫 ផ្អាកគណនី'}
                            </button>

                            <button 
                              style={{ background: 'transparent', border: 'none', color: '#dc2626', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, textAlign: 'left' }}
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(null); handleDeleteUser(user.user_id); }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              🗑️ លុប
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded Details Box */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, background: 'var(--bg-surface)', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)', animation: 'fadeIn 0.2s ease', marginTop: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>Phone:</span>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: (user.phone && (user.phone.includes(':') || user.phone.length > 25)) ? 'var(--text-muted)' : 'inherit' }}>
                          {user.phone && (user.phone.includes(':') || user.phone.length > 25) ? '🔒 Protected' : (user.phone || '---')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>Active:</span>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: 10.5, color: active.online ? '#10b981' : 'inherit' }}>
                          {active.text}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomersTab;
