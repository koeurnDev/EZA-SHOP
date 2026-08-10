import React, { useMemo } from 'react';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';

const AdminOrdersTab = React.memo(({
  orders, searchTerm, orderFilter, setOrderFilter,
  localSearchTerm, setLocalSearchTerm,
  updateStatus, setPrintingOrder, statusTags
}) => {
  const { t } = useUser();

  const ORDER_FILTER_OPTIONS = useMemo(() => [
    { value: 'all', label: t('admin_filter_all') },
    { value: 'pending', label: `⌛ ${t('admin_filter_pending')}` },
    { value: 'paid', label: `✅ ${t('admin_filter_paid')}` },
    { value: 'processing', label: `📦 ${t('admin_filter_preparing')}` },
    { value: 'shipped', label: `🚚 ${t('admin_filter_shipped')}` },
    { value: 'cancelled', label: `❌ ${t('admin_filter_cancelled')}` },
    { value: 'active', label: `🚀 ${t('admin_active_orders')}` },
  ], [t]);
  const filtered = orders.filter(o => {
    const matchesSearch = (o.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      || (o.order_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (orderFilter === 'pending') return matchesSearch && o.status === 'pending';
    if (orderFilter === 'paid') return matchesSearch && o.status === 'paid';
    if (orderFilter === 'processing') return matchesSearch && o.status === 'processing';
    if (orderFilter === 'shipped') return matchesSearch && (o.status === 'shipped' || o.status === 'delivering');
    if (orderFilter === 'cancelled') return matchesSearch && o.status === 'cancelled';
    if (orderFilter === 'active') return matchesSearch && ['paid', 'processing', 'shipped', 'delivering'].includes(o.status);
    if (orderFilter === 'all' && !searchTerm) return o.status !== 'pending';
    return matchesSearch;
  });

  return (
    <div className="tab-pane-animate">
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, position: 'relative', zIndex: 10 }}>
        <input
          className="input-glass-admin"
          style={{ flex: 1 }}
          placeholder={t('admin_search_order')}
          value={localSearchTerm}
          onChange={e => setLocalSearchTerm(e.target.value)}
        />
        <DarkSelect
          style={{ width: 150 }}
          value={orderFilter}
          onChange={setOrderFilter}
          options={ORDER_FILTER_OPTIONS}
        />
      </div>

      {filtered.map(o => (
        <div key={o.id} className="glass-card-luxury" style={{ marginBottom: 15, padding: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <span className="ticket-id-luxury">{o.order_code || o.id}</span>
            <span style={{ fontSize: 11, fontWeight: 900, background: 'var(--glass-border)', padding: '4px 10px', borderRadius: 8 }}>
              {(statusTags[o.status] || {}).icon} {(statusTags[o.status] || {}).label}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{o.user_name}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>📞 {o.phone}</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>${parseFloat(o.total).toFixed(2)}</div>
          </div>
          <div className="button-group-pro" style={{ flexWrap: 'wrap' }}>
            {o.receipt_url && (
              <div style={{ width: '100%', marginBottom: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img
                  src={o.receipt_url}
                  alt="Receipt"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: 'var(--bg-soft)', cursor: 'pointer' }}
                  onClick={() => {
                    const tg = window.Telegram?.WebApp;
                    if (tg?.openLink) {
                      tg.openLink(o.receipt_url);
                    } else {
                      window.open(o.receipt_url, '_blank');
                    }
                  }}
                />
              </div>
            )}
            {o.status === 'pending' && <button className="ticket-btn-primary" style={{ flex: 1 }} onClick={() => updateStatus(o.id, 'paid')}>💰 {t('admin_filter_paid')}</button>}
            {o.status === 'paid' && <button className="ticket-btn-primary" onClick={() => updateStatus(o.id, 'processing')}>📦 {t('admin_filter_preparing')}</button>}
            {o.status === 'processing' && <button className="ticket-btn-primary" onClick={() => updateStatus(o.id, 'shipped')}>✨ {t('admin_filter_shipped')}</button>}
            {['paid', 'processing', 'shipped', 'delivering', 'delivered'].includes(o.status) && (
              <button className="icon-btn-admin" style={{ flexShrink: 0 }} aria-label="Print Order" onClick={() => {
                setPrintingOrder(o);
                setTimeout(() => { window.print(); setPrintingOrder(null); }, 100);
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

export default AdminOrdersTab;
