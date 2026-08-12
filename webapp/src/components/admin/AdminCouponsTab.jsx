import React, { useState, useEffect } from 'react';
import { useQuery } from '../../hooks/useQuery';
import { useApi } from '../../hooks/useApi';
import { useTelegram } from '../../context/TelegramContext';
import DarkSelect from './DarkSelect';

const AdminCouponsTab = ({ BACKEND_URL }) => {
  const { initData, showAlert, showConfirm } = useTelegram();
  const { fetchWithRetry } = useApi();
  const headers = { 'X-TG-Data': initData || '' };

  const { data: couponsData, loading, refetch } = useQuery('admin-coupons', `${BACKEND_URL}/api/admin/coupons`, { headers });
  const coupons = couponsData?.coupons || [];

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: '',
    isAuto: false,
    usageLimit: ''
  });

  const handleDelete = (id) => {
    showConfirm('តើអ្នកពិតជាចង់លុបប័ណ្ណបញ្ចុះតម្លៃនេះមែនទេ?', async (confirmed) => {
      if (!confirmed) return;
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/coupons/${id}`, {
          method: 'DELETE',
          headers
        });
        if (res?.success) {
          showAlert('បានលុបជោគជ័យ!');
          refetch(false);
        }
      } catch (err) {
        showAlert(`Error: ${err.message}`);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.value) {
      return showAlert('សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់!');
    }
    
    try {
      const payload = {
        code: formData.code,
        type: formData.type,
        value: parseFloat(formData.value),
        isAuto: formData.isAuto,
        applyTo: 'all'
      };
      
      if (formData.usageLimit) {
        payload.usageLimit = parseInt(formData.usageLimit, 10);
      }

      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/coupons`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res?.success) {
        showAlert('បានបន្ថែមជោគជ័យ!');
        setIsAdding(false);
        setFormData({ code: '', type: 'percent', value: '', isAuto: false, usageLimit: '' });
        refetch(false);
      }
    } catch (err) {
      showAlert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="tab-pane-animate">
      <div className="glass-card-luxury" style={{ padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', gap: '10px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-bold)', margin: 0 }}>🎫 គ្រប់គ្រងប័ណ្ណបញ្ចុះតម្លៃ</h3>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '12px', 
              whiteSpace: 'nowrap', 
              background: isAdding ? 'var(--bg-soft)' : 'var(--primary-gradient)', 
              color: isAdding ? 'var(--text-main)' : '#ffffff', 
              border: isAdding ? '1px solid var(--border-subtle)' : 'none',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {isAdding ? 'បោះបង់' : '+ បង្កើតថ្មី'}
          </button>
        </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-soft)', padding: '20px', borderRadius: '18px', marginBottom: '24px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">កូដបញ្ចុះតម្លៃ</label>
              <input 
                className="admin-form-input" 
                placeholder="ឧ. VIP10" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ប្រភេទបញ្ចុះតម្លៃ</label>
              <DarkSelect
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
                style={{ width: '100%' }}
                triggerClassName="admin-form-select-trigger"
                menuClassName="admin-form-select-menu"
                options={[
                  { value: 'percent', label: 'ភាគរយ' },
                  { value: 'fixed', label: 'ទឹកប្រាក់' }
                ]}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ចំនួនបញ្ចុះ</label>
              <input 
                className="admin-form-input" 
                type="number" 
                step="0.01"
                placeholder="ឧ. 10" 
                value={formData.value} 
                onChange={e => setFormData({...formData, value: e.target.value})}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ចំនួនដងប្រើបាន</label>
              <input 
                className="admin-form-input" 
                type="number" 
                placeholder="ទុកចំហ បើមិនចង់កំណត់" 
                value={formData.usageLimit} 
                onChange={e => setFormData({...formData, usageLimit: e.target.value})}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="isAuto" 
              checked={formData.isAuto}
              onChange={e => setFormData({...formData, isAuto: e.target.checked})}
              style={{ width: 18, height: 18, accentColor: '#ec4899', cursor: 'pointer' }}
            />
            <label htmlFor="isAuto" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-bold)', cursor: 'pointer' }}>
              បញ្ចុះតម្លៃដោយស្វ័យប្រវត្តិ — មិនបាច់វាយកូដ
            </label>
          </div>

          <button type="submit" style={{ marginTop: '18px', width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--primary-gradient)', color: '#ffffff', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: 14 }}>
            💾 រក្សាទុកប័ណ្ណបញ្ចុះតម្លៃ
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>កំពុងទាញយកទិន្នន័យ...</div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-soft)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
          មិនទាន់មានប័ណ្ណបញ្ចុះតម្លៃនៅឡើយទេ
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '12px 10px', color: 'var(--text-bold)' }}>កូដ</th>
                <th style={{ padding: '12px 10px', color: 'var(--text-bold)' }}>បញ្ចុះ</th>
                <th style={{ padding: '12px 10px', color: 'var(--text-bold)' }}>ការប្រើប្រាស់</th>
                <th style={{ padding: '12px 10px', color: 'var(--text-bold)' }}>ស្ថានភាព</th>
                <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-bold)' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const limitReached = c.usage_limit && c.used_count >= c.usage_limit;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--text-bold)' }}>{c.code}</td>
                    <td style={{ padding: '12px 10px', color: '#ec4899', fontWeight: 800 }}>
                      {c.discount_type === 'percent' ? `${c.value}%` : `$${c.value}`}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {c.used_count || 0} / {c.usage_limit || '∞'} 
                      {limitReached && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginLeft: '5px', fontWeight: 'bold' }}>(ពេញ)</span>}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {c.is_auto ? (
                        <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>ស្វ័យប្រវត្តិ</span>
                      ) : (
                        <span style={{ background: 'var(--bg-soft)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, border: '1px solid var(--border-subtle)' }}>ប្រើកូដ</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                      >
                        លុប
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);
};

export default AdminCouponsTab;
