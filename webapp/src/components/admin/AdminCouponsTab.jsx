import React, { useState } from 'react';
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
    <div className="tab-pane-animate admin-coupons-tab">
      <div className="glass-card-luxury admin-coupons-card">
        <div className="admin-coupons-head">
          <h3 className="admin-coupons-title">គ្រប់គ្រងប័ណ្ណបញ្ចុះតម្លៃ</h3>
          <button
            type="button"
            className={isAdding ? 'admin-products-scan-btn' : 'admin-products-add-btn'}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? 'បោះបង់' : '+ បង្កើតថ្មី'}
          </button>
        </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="admin-coupon-form">
          <div className="admin-coupon-form-grid">
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">កូដបញ្ចុះតម្លៃ</label>
              <input
                className="input-glass-admin admin-form-input"
                placeholder="ឧ. VIP10"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
                className="input-glass-admin admin-form-input"
                type="number"
                step="0.01"
                placeholder="ឧ. 10"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <label className="admin-form-label">ចំនួនដងប្រើបាន</label>
              <input
                className="input-glass-admin admin-form-input"
                type="number"
                placeholder="ទុកចំហ បើមិនចង់កំណត់"
                value={formData.usageLimit}
                onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
              />
            </div>
          </div>

          <label className="admin-coupon-auto">
            <input
              type="checkbox"
              checked={formData.isAuto}
              onChange={e => setFormData({ ...formData, isAuto: e.target.checked })}
            />
            <span>បញ្ចុះតម្លៃដោយស្វ័យប្រវត្តិ — មិនបាច់វាយកូដ</span>
          </label>

          <button type="submit" className="admin-broadcast-send-btn">
            រក្សាទុកប័ណ្ណបញ្ចុះតម្លៃ
          </button>
        </form>
      )}

      {loading ? (
        <div className="admin-coupon-empty">កំពុងទាញយកទិន្នន័យ...</div>
      ) : coupons.length === 0 ? (
        <div className="admin-coupon-empty">មិនទាន់មានប័ណ្ណបញ្ចុះតម្លៃនៅឡើយទេ</div>
      ) : (
        <div className="admin-coupon-table-wrap">
          <table className="admin-data-table admin-coupon-table">
            <thead>
              <tr>
                <th>កូដ</th>
                <th>បញ្ចុះ</th>
                <th>ការប្រើប្រាស់</th>
                <th>ស្ថានភាព</th>
                <th style={{ textAlign: 'right' }}>សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => {
                const limitReached = c.usage_limit && c.used_count >= c.usage_limit;
                return (
                  <tr key={c.id}>
                    <td className="admin-coupon-code">{c.code}</td>
                    <td className="admin-coupon-value">
                      {c.discount_type === 'percent' ? `${c.value}%` : `$${c.value}`}
                    </td>
                    <td>
                      {c.used_count || 0} / {c.usage_limit || '∞'}
                      {limitReached && <span className="admin-coupon-full">(ពេញ)</span>}
                    </td>
                    <td>
                      {c.is_auto ? (
                        <span className="admin-coupon-badge">ស្វ័យប្រវត្តិ</span>
                      ) : (
                        <span className="admin-coupon-badge admin-coupon-badge--muted">ប្រើកូដ</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="admin-coupon-delete" onClick={() => handleDelete(c.id)}>
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
