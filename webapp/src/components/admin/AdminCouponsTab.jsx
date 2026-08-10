import React, { useState, useEffect } from 'react';
import { useQuery } from '../../hooks/useQuery';
import { useApi } from '../../hooks/useApi';
import { useTelegram } from '../../context/TelegramContext';

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
    <div className="admin-glass-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="admin-section-title">🎫 គ្រប់គ្រងប័ណ្ណបញ្ចុះតម្លៃ (Coupons)</h3>
        <button 
          className="admin-btn-primary" 
          onClick={() => setIsAdding(!isAdding)}
          style={{ padding: '8px 15px', borderRadius: '8px' }}
        >
          {isAdding ? 'បោះបង់' : '+ បង្កើតថ្មី'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(0,0,0,0.02)', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className="admin-form-label">កូដបញ្ចុះតម្លៃ (Code)</label>
              <input 
                className="admin-form-input" 
                placeholder="ឧ. VIP10" 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                required
              />
            </div>
            <div>
              <label className="admin-form-label">ប្រភេទបញ្ចុះតម្លៃ</label>
              <select 
                className="admin-form-input"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="percent">ភាគរយ (%)</option>
                <option value="fixed">ទឹកប្រាក់ ($)</option>
              </select>
            </div>
            <div>
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
            <div>
              <label className="admin-form-label">ចំនួនដងអាចប្រើបាន (Usage Limit)</label>
              <input 
                className="admin-form-input" 
                type="number" 
                placeholder="ទុកចំហ បើមិនចង់កំណត់" 
                value={formData.usageLimit} 
                onChange={e => setFormData({...formData, usageLimit: e.target.value})}
              />
            </div>
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="checkbox" 
              id="isAuto" 
              checked={formData.isAuto}
              onChange={e => setFormData({...formData, isAuto: e.target.checked})}
            />
            <label htmlFor="isAuto" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              បញ្ចុះតម្លៃដោយស្វ័យប្រវត្តិ (មិនបាច់វាយកូដ)
            </label>
          </div>

          <button type="submit" className="admin-btn-primary" style={{ marginTop: '15px', width: '100%', padding: '12px', borderRadius: '8px' }}>
            💾 រក្សាទុកប័ណ្ណបញ្ចុះតម្លៃ
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>កំពុងទាញយកទិន្នន័យ...</div>
      ) : coupons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#666', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
          មិនទាន់មានប័ណ្ណបញ្ចុះតម្លៃនៅឡើយទេ
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(0,0,0,0.1)', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>កូដ</th>
                <th style={{ padding: '10px' }}>បញ្ចុះ</th>
                <th style={{ padding: '10px' }}>ការប្រើប្រាស់</th>
                <th style={{ padding: '10px' }}>ស្ថានភាព</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const limitReached = c.usage_limit && c.used_count >= c.usage_limit;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.code}</td>
                    <td style={{ padding: '10px', color: 'var(--color-primary)' }}>
                      {c.discount_type === 'percent' ? `${c.value}%` : `$${c.value}`}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {c.used_count || 0} / {c.usage_limit || '∞'} 
                      {limitReached && <span style={{ color: 'red', fontSize: '0.8rem', marginLeft: '5px' }}>(ពេញ)</span>}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {c.is_auto ? (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>ស្វ័យប្រវត្តិ</span>
                      ) : (
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>ប្រើកូដ</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
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
  );
};

export default AdminCouponsTab;
