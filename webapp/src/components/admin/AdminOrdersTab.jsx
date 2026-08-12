import React, { useMemo } from 'react';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';
import { useTelegram } from '../../context/TelegramContext';

const AdminOrdersTab = React.memo(({
  orders, searchTerm, orderFilter, setOrderFilter,
  localSearchTerm, setLocalSearchTerm,
  updateStatus, setPrintingOrder, statusTags,
  trackingNumbers = {}, setTrackingNumbers
}) => {
  const { t, lang } = useUser();
  const { showPopup, showAlert, tg } = useTelegram();
  const [sortDirection, setSortDirection] = React.useState('newest'); // 'newest' | 'oldest'
  const [checkedItems, setCheckedItems] = React.useState({}); // { [orderId_itemIdx]: true }
  const [courierFilter, setCourierFilter] = React.useState('all'); // 'all' | courierName
  const [showPickList, setShowPickList] = React.useState(false);
  const [expandedReceipts, setExpandedReceipts] = React.useState({});

  const toggleReceipt = (orderId) => {
    setExpandedReceipts(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // 📊 Calculate Order Counts & Multi-order Customers for Staff
  const { counts, phoneCounts, courierOptions, grabCount } = useMemo(() => {
    let toPack = 0;
    let shipped = 0;
    let pending = 0;
    let grabC = 0;
    const phoneMap = {};
    const couriers = new Set();
    orders.forEach(o => {
      if (['paid', 'processing'].includes(o.status)) toPack++;
      if (['shipped', 'delivering'].includes(o.status)) shipped++;
      if (o.status === 'pending') pending++;

      if (o.delivery_company) couriers.add(o.delivery_company);
      if ((o.delivery_company || '').toLowerCase().includes('grab') && ['paid', 'processing'].includes(o.status)) {
        grabC++;
      }

      if (o.phone && ['paid', 'processing', 'pending'].includes(o.status)) {
        phoneMap[o.phone] = (phoneMap[o.phone] || 0) + 1;
      }
    });

    const cOptions = [{ value: 'all', label: '🚚 គ្រប់ក្រុមហ៊ុនដឹក' }, ...Array.from(couriers).map(c => ({ value: c, label: `🚚 ${c}` }))];
    return { counts: { toPack, shipped, pending, total: orders.length - pending }, phoneCounts: phoneMap, courierOptions: cOptions, grabCount: grabC };
  }, [orders]);

  const toggleCheckItem = (orderId, itemIdx) => {
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ORDER_FILTER_OPTIONS = useMemo(() => [
    { value: 'active_pack', label: `🔥 ត្រូវរៀបចំ (${counts.toPack})` },
    { value: 'all', label: `${t('admin_filter_all')} (${counts.total})` },
    { value: 'pending', label: `⌛ ${t('admin_filter_pending')} (${counts.pending})` },
    { value: 'paid', label: `✅ ${t('admin_filter_paid')}` },
    { value: 'processing', label: `📦 ${t('admin_filter_preparing')}` },
    { value: 'shipped', label: `🚚 ${t('admin_filter_shipped')} (${counts.shipped})` },
    { value: 'cancelled', label: `❌ ${t('admin_filter_cancelled')}` },
    { value: 'active', label: `🚀 ${t('admin_active_orders')}` },
  ], [t, counts]);

  const filtered = useMemo(() => {
    const list = orders.filter(o => {
      const matchesSearch = (o.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (o.order_code || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (o.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCourier = courierFilter === 'all' || o.delivery_company === courierFilter;

      if (!matchesCourier) return false;

      if (orderFilter === 'active_pack') return matchesSearch && ['paid', 'processing'].includes(o.status);
      if (orderFilter === 'pending') return matchesSearch && o.status === 'pending';
      if (orderFilter === 'paid') return matchesSearch && o.status === 'paid';
      if (orderFilter === 'processing') return matchesSearch && o.status === 'processing';
      if (orderFilter === 'shipped') return matchesSearch && (o.status === 'shipped' || o.status === 'delivering');
      if (orderFilter === 'cancelled') return matchesSearch && o.status === 'cancelled';
      if (orderFilter === 'active') return matchesSearch && ['paid', 'processing', 'shipped', 'delivering'].includes(o.status);
      if (orderFilter === 'all' && !searchTerm) return o.status !== 'pending';
      return matchesSearch;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortDirection === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [orders, searchTerm, orderFilter, courierFilter, sortDirection]);

  // 📦 Compute Aggregated Stock Pick List for Warehouse Staff
  const batchPickSummary = useMemo(() => {
    const map = {};
    let totalItemsCount = 0;
    filtered.forEach(o => {
      let items = [];
      try {
        items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      } catch (e) {}

      items.forEach(it => {
        const name = it.name || it.product_name || 'ទំនិញ';
        const size = it.selectedSize || it.size || '';
        const color = it.selectedColor || it.color || '';
        const weight = it.selectedWeight || it.weight || it.kilo || it.weight_kg || '';
        const height = it.selectedHeight || it.height || '';
        const variant = it.selectedVariant || it.variant || it.option || '';
        const qty = Number(it.quantity) || 1;

        const key = `${name}_${size}_${color}_${weight}_${height}_${variant}`;
        if (!map[key]) {
          map[key] = { name, size, color, weight, height, variant, totalQty: 0 };
        }
        map[key].totalQty += qty;
        totalItemsCount += qty;
      });
    });
    return { list: Object.values(map), totalItemsCount };
  }, [filtered]);

  return (
    <div className="tab-pane-animate">
      {/* 🔍 Search & Clean Filter Bar */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Row 1: Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            className="input-glass-admin"
            style={{ width: '100%', fontSize: 13, padding: '10px 36px 10px 14px', borderRadius: 12, boxSizing: 'border-box' }}
            placeholder={t('admin_search_order') || '🔍 ស្វែងរកតាម Order ID / ឈ្មោះ / លេខទូរស័ព្ទ...'}
            value={localSearchTerm}
            onChange={e => setLocalSearchTerm(e.target.value)}
          />
          {localSearchTerm && (
            <button 
              onClick={() => setLocalSearchTerm('')} 
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 900 }}
            >
              ✖
            </button>
          )}
        </div>

        {/* Row 2: Status & Courier Select Dropdowns */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <DarkSelect
              style={{ width: '100%' }}
              value={orderFilter}
              onChange={setOrderFilter}
              options={ORDER_FILTER_OPTIONS}
            />
          </div>
          {courierOptions.length > 1 && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <DarkSelect
                style={{ width: '100%' }}
                value={courierFilter}
                onChange={setCourierFilter}
                options={courierOptions}
              />
            </div>
          )}
        </div>

        {/* Row 3: Quick Action Chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
            <button
              onClick={() => {
                setOrderFilter('active_pack');
                setCourierFilter('all');
              }}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 900, cursor: 'pointer', border: 'none',
                background: orderFilter === 'active_pack' && courierFilter === 'all' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-soft)',
                color: orderFilter === 'active_pack' && courierFilter === 'all' ? '#fff' : 'var(--text-bold)',
                whiteSpace: 'nowrap'
              }}>
              🔥 ត្រូវរៀបចំ ({counts.toPack})
            </button>

            {grabCount > 0 && (
              <button
                onClick={() => {
                  setOrderFilter('active_pack');
                  setCourierFilter(prev => prev === 'grab' ? 'all' : 'grab');
                }}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 900, cursor: 'pointer',
                  border: courierFilter === 'grab' ? 'none' : '1px solid #00b14f',
                  background: courierFilter === 'grab' ? '#00b14f' : 'rgba(0,177,79,0.12)',
                  color: courierFilter === 'grab' ? '#fff' : '#00b14f', whiteSpace: 'nowrap'
                }}>
                🛵 Grab ({grabCount})
              </button>
            )}

            <button
              onClick={() => setShowPickList(true)}
              style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 900, cursor: 'pointer', border: '1px solid #10b981',
                background: 'rgba(16,185,129,0.15)', color: '#10b981', whiteSpace: 'nowrap'
              }}>
              📋 យកអីវ៉ាន់ពីឃ្លាំង ({batchPickSummary.totalItemsCount})
            </button>
          </div>

          {/* Sort Direction Button */}
          <button
            onClick={() => setSortDirection(prev => prev === 'newest' ? 'oldest' : 'newest')}
            style={{
              padding: '6px 10px', borderRadius: 10, fontSize: 10, fontWeight: 900, cursor: 'pointer',
              background: sortDirection === 'oldest' ? 'rgba(245,158,11,0.2)' : 'var(--bg-soft)',
              color: sortDirection === 'oldest' ? '#f59e0b' : 'var(--text-muted)',
              border: sortDirection === 'oldest' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap', flexShrink: 0
            }}>
            {sortDirection === 'oldest' ? '⚠️ ចាស់មុន' : '⬇️ ថ្មីមុន'}
          </button>
        </div>
      </div>

      {/* 📦 Modal: Aggregated Warehouse Pick List */}
      {showPickList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="glass-card-luxury animate-up" style={{ width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-surface, #1e1e24)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.18))', color: 'var(--text-bold, #ffffff)', padding: 24, borderRadius: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', paddingBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 950, color: 'var(--text-bold, #ffffff)' }}>📦 បញ្ជីសរុបទំនិញត្រូវយកពីឃ្លាំង</div>
              <button onClick={() => setShowPickList(false)} style={{ border: 'none', background: 'var(--bg-soft, rgba(255,255,255,0.1))', color: 'var(--text-bold, #ffffff)', borderRadius: '50%', width: 32, height: 32, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            
            <div style={{ fontSize: 13, color: 'var(--text-muted, rgba(255,255,255,0.7))', marginBottom: 16, lineHeight: 1.5 }}>
              សរុបទំនិញទាំង <strong style={{ color: 'var(--text-bold, #ffffff)' }}>{filtered.length}</strong> ការកុម្ម៉ង់ដែលកំពុង Filter (<strong style={{ color: '#3b82f6' }}>{batchPickSummary.totalItemsCount} មុខ</strong>) សម្រាប់ Staff ទៅដកពីឃ្លាំងក្នុងពេលតែមួយ៖
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {batchPickSummary.list.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '25px 0', color: 'var(--text-muted)' }}>គ្មានទំនិញត្រូវដកពីឃ្លាំងទេ</div>
              ) : (
                batchPickSummary.list.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-soft, rgba(255,255,255,0.05))', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-bold, #ffffff)' }}>• {it.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {it.size && <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>Size: {it.size}</span>}
                        {it.color && <span style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>Color: {it.color}</span>}
                        {it.weight && <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>Weight: {it.weight}</span>}
                        {it.height && <span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>Height: {it.height}</span>}
                        {it.variant && !it.size && !it.color && <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>Opt: {it.variant}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 950, color: '#d4af37', background: 'rgba(212,175,55,0.18)', padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(212,175,55,0.3)' }}>
                      x{it.totalQty}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                const text = `📦 បញ្ជីសរុបទំនិញត្រូវដកពីឃ្លាំង (${batchPickSummary.totalItemsCount} មុខ):\n` +
                  batchPickSummary.list.map(i => `• ${i.name}${i.size ? ` [Size: ${i.size}]` : ''}${i.color ? ` [Color: ${i.color}]` : ''}${i.weight ? ` [Weight: ${i.weight}]` : ''}${i.height ? ` [Height: ${i.height}]` : ''}${i.variant ? ` [Opt: ${i.variant}]` : ''} => x${i.totalQty}`).join('\n');
                navigator.clipboard.writeText(text);
                if (showAlert) showAlert("បាន Copy បញ្ជីសរុបទំនិញឃ្លាំង ជោគជ័យ!");
              }}
              style={{ width: '100%', height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: '#fff', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)', fontSize: 14 }}>
              📋 Copy បញ្ជីដកពីឃ្លាំង
            </button>
          </div>
        </div>
      )}

      {filtered.map(o => {
        let items = [];
        try {
          items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
        } catch (e) {}

        const fullAddr = [o.address, o.province].filter(Boolean).join(', ');

        const orderTime = new Date(o.created_at || Date.now());
        const now = new Date();
        const diffHours = Math.floor((now - orderTime) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const timeLabel = orderTime.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isLeftover = diffHours >= 12 && ['paid', 'processing'].includes(o.status);

        const hasMultipleOrders = o.phone && (phoneCounts[o.phone] || 0) > 1;
        const cleanUserName = (o.user_name || '').replace(/\s*-\s*$/, '').trim() || (lang === 'kh' ? 'អតិថិជន' : 'Customer');

        return (
          <div key={o.id} className="glass-card-luxury" style={{ marginBottom: 15, padding: 15, borderLeft: isLeftover ? '4px solid #ef4444' : hasMultipleOrders ? '4px solid #f59e0b' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="ticket-id-luxury" style={{ fontWeight: 900 }}>#{o.order_code || o.id}</span>
                {hasMultipleOrders && (
                  <span style={{ fontSize: 10, fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', padding: '3px 8px', borderRadius: 8, boxShadow: '0 2px 6px rgba(245,158,11,0.3)' }}>
                    🎁 មាន {phoneCounts[o.phone]} កម្ម៉ង់រួមគ្នា!
                  </span>
                )}
                {isLeftover && (
                  <span style={{ fontSize: 10, fontWeight: 900, background: '#ef4444', color: '#fff', padding: '3px 8px', borderRadius: 8 }}>
                    ⚠️ សេសសល់ {diffDays > 0 ? `${diffDays}ថ្ងៃ` : `${diffHours}ម៉ោង`}
                  </span>
                )}
              </div>

              {/* Status Change Selector Dropdown */}
              <select
                value={o.status === 'delivered' ? 'shipped' : o.status}
                onChange={(e) => updateStatus(o.id, e.target.value)}
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  padding: '5px 10px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: o.status === 'paid' ? 'rgba(16, 185, 129, 0.15)' : o.status === 'processing' ? 'rgba(59, 130, 246, 0.15)' : ['shipped', 'delivering', 'delivered'].includes(o.status) ? 'rgba(168, 85, 247, 0.15)' : o.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-soft)',
                  color: o.status === 'paid' ? '#10b981' : o.status === 'processing' ? '#3b82f6' : ['shipped', 'delivering', 'delivered'].includes(o.status) ? '#a855f7' : o.status === 'cancelled' ? '#ef4444' : 'var(--text-bold)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="pending" style={{ background: 'var(--bg-surface)', color: 'var(--text-bold)' }}>⌛ រង់ចាំបង់ប្រាក់</option>
                <option value="paid" style={{ background: 'var(--bg-surface)', color: 'var(--text-bold)' }}>✅ បានបង់ប្រាក់</option>
                <option value="processing" style={{ background: 'var(--bg-surface)', color: 'var(--text-bold)' }}>📦 កំពុងរៀបចំ</option>
                <option value="shipped" style={{ background: 'var(--bg-surface)', color: 'var(--text-bold)' }}>🚚 បានប្រគល់ឱ្យអ្នកដឹក</option>
                <option value="cancelled" style={{ background: 'var(--bg-surface)', color: 'var(--text-bold)' }}>❌ លុបចោល</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-bold)' }}>{cleanUserName}</div>
                {o.phone && (
                  <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <a href={`tel:${o.phone}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 800 }}>
                      📞 {o.phone}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(o.phone);
                        if (showAlert) showAlert(`បាន Copy លេខទូរស័ព្ទ (${o.phone}) ជោគជ័យ!`);
                      }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
                {fullAddr && (
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>📍 {fullAddr}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fullAddr);
                        if (showAlert) showAlert('បាន Copy អាសយដ្ឋាន ជោគជ័យ!');
                      }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'var(--bg-soft)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: 800 }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
                {o.delivery_company && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4, color: 'var(--text-main)' }}>🚚 ក្រុមហ៊ុនដឹក៖ <strong>{o.delivery_company}</strong></div>}
                {o.note && (
                  <div style={{ fontSize: 11, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 8px', fontWeight: 800, marginTop: 6 }}>
                    📝 ចំណាំ៖ {o.note}
                  </div>
                )}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, color: 'var(--text-muted)' }}>🕒 {timeLabel}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 950, textAlign: 'right', color: 'var(--text-bold)', flexShrink: 0 }}>${parseFloat(o.total).toFixed(2)}</div>
            </div>

            {/* 🛍️ Staff Packing Items List with Checkboxes & Badges */}
            {items.length > 0 && (
              <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '10px 12px', marginBottom: 12, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📦 បញ្ជីទំនិញ ({items.length} មុខ)</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ចុច ☑️ ពេលរៀបចំរួច</span>
                </div>
                {items.map((it, idx) => {
                  const itemKey = `${o.id}_${idx}`;
                  const isChecked = !!checkedItems[itemKey];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleCheckItem(o.id, idx)}
                      style={{ 
                        fontSize: 12, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                        background: isChecked ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        border: '1px solid ' + (isChecked ? 'rgba(16,185,129,0.3)' : 'transparent'),
                        textDecoration: isChecked ? 'line-through' : 'none',
                        opacity: isChecked ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14 }}>{isChecked ? '✅' : '⬜'}</span>
                        <span style={{ color: 'var(--text-bold)' }}>{it.name || it.product_name}</span>
                        {(it.selectedSize || it.size) && (
                          <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>
                            Size: {it.selectedSize || it.size}
                          </span>
                        )}
                        {(it.selectedColor || it.color) && (
                          <span style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>
                            Color: {it.selectedColor || it.color}
                          </span>
                        )}
                        {(it.selectedWeight || it.weight || it.kilo || it.weight_kg) && (
                          <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>
                            Weight: {it.selectedWeight || it.weight || it.kilo || it.weight_kg}
                          </span>
                        )}
                        {(it.selectedHeight || it.height) && (
                          <span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>
                            Height: {it.selectedHeight || it.height}
                          </span>
                        )}
                        {(it.selectedVariant || it.variant || it.option) && !(it.selectedSize || it.size) && !(it.selectedColor || it.color) && (
                          <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>
                            Opt: {it.selectedVariant || it.variant || it.option}
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 900, color: isChecked ? '#10b981' : '#ec4899', fontSize: 13 }}>x{it.quantity || 1}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🧾 Collapsible Payment Receipt Attachment */}
            {o.receipt_url && (
              <div style={{ width: '100%', marginBottom: 12 }}>
                <button
                  onClick={() => toggleReceipt(o.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: expandedReceipts[o.id] ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-soft)',
                    color: expandedReceipts[o.id] ? '#3b82f6' : 'var(--text-main)',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}
                >
                  <span>🧾 វិក្កយបត្របង់ប្រាក់ (ABA PAY / Receipt)</span>
                  <span>{expandedReceipts[o.id] ? '▲ បិទរូប' : '▼ មើលរូបភាព'}</span>
                </button>

                {expandedReceipts[o.id] && (
                  <div style={{ marginTop: 8, textAlign: 'center', background: 'var(--bg-soft)', padding: 10, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <img
                      src={o.receipt_url}
                      alt="Receipt"
                      style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 8, cursor: 'pointer', background: 'rgba(0,0,0,0.1)' }}
                      onClick={() => {
                        if (tg?.openLink) tg.openLink(o.receipt_url);
                        else window.open(o.receipt_url, '_blank');
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="button-group-pro" style={{ flexWrap: 'wrap', gap: 8 }}>
              {['paid', 'processing', 'shipped'].includes(o.status) && setTrackingNumbers && (
                <div style={{ width: '100%', marginBottom: 6 }}>
                  <input
                    type="text"
                    className="input-glass-admin"
                    style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
                    placeholder={t('admin_tracking_no') || '🚚 លេខ Tracking (មិនបាច់បំពេញក៏បាន)'}
                    value={trackingNumbers[o.id] !== undefined ? trackingNumbers[o.id] : (o.tracking_number || '')}
                    onChange={(e) => setTrackingNumbers(prev => ({ ...prev, [o.id]: e.target.value }))}
                  />
                </div>
              )}
              {o.status === 'pending' && (
                <button className="ticket-btn-primary" style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 900 }} onClick={() => updateStatus(o.id, 'paid')}>
                  1. 💰 បញ្ជាក់ការបង់ប្រាក់
                </button>
              )}
              {o.status === 'paid' && (
                <button className="ticket-btn-primary" style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }} onClick={() => updateStatus(o.id, 'processing')}>
                  2. 📦 កំពុងរៀបចំអីវ៉ាន់
                </button>
              )}
              {o.status === 'processing' && (
                <button className="ticket-btn-primary" style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 900, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }} onClick={() => updateStatus(o.id, 'shipped')}>
                  3. 🚚 ប្រគល់អីវ៉ាន់ឱ្យអ្នកដឹក
                </button>
              )}
              {['shipped', 'delivering', 'delivered'].includes(o.status) && (
                <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  ✅ បានប្រគល់ឱ្យអ្នកដឹកជញ្ជូនរួចរាល់
                </div>
              )}
              {['paid', 'processing', 'shipped', 'delivering', 'delivered'].includes(o.status) && (
                <button className="icon-btn-admin" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 12 }} aria-label="Print Order" onClick={() => {
                  if (tg && ['android', 'ios'].includes(tg.platform) && showPopup) {
                    showPopup({
                      title: 'ជម្រើស Print / Copy ស្លឹកកុម្ម៉ង់',
                      message: 'Telegram មិនអនុញ្ញាតឱ្យ Print ផ្ទាល់ទេ។ សូមជ្រើសរើស:',
                      buttons: [
                        { id: 'copy', type: 'default', text: 'ចម្លងអត្ថបទរៀបចំអីវ៉ាន់ (Copy Slip)' },
                        { id: 'browser', type: 'default', text: 'បើក Print ពេញលេញក្នុង Browser' },
                        { type: 'cancel' }
                      ]
                    }, (buttonId) => {
                      if (buttonId === 'copy') {
                        try {
                          const itemsText = items.map(i => `- ${i.name || i.product_name} x${i.quantity || 1}${(i.selectedSize || i.size) ? ` [Size: ${i.selectedSize || i.size}]` : ''}${(i.selectedColor || i.color) ? ` [Color: ${i.color}]` : ''}`).join('\n');
                          const text = `📋 ស្លឹកកុម្ម៉ង់រៀបចំអីវ៉ាន់\nលេខកូដ: ${o.order_code || o.id}\nអតិថិជន: ${cleanUserName}\nទូរស័ព្ទ: ${o.phone}\nទីតាំង: ${fullAddr || '—'}\nក្រុមហ៊ុនដឹក: ${o.delivery_company || '—'}\nចំណាំ: ${o.note || 'គ្មាន'}\n----------------\n${itemsText}\n----------------\nសរុប: $${parseFloat(o.total).toFixed(2)}`;
                          navigator.clipboard.writeText(text);
                          showAlert("បានចម្លងស្លឹកកុម្ម៉ង់ (Copy Slip) ជោគជ័យ! អាច Send ទៅក្រុមការងារ ឬរៀបចំអីវ៉ាន់បាន។");
                        } catch (e) {
                          console.error(e);
                          showAlert("មានបញ្ហាក្នុងការចម្លង!");
                        }
                      } else if (buttonId === 'browser') {
                        showAlert("ដើម្បី Print ជាវិក្កយបត្រពេញលេញ:\n1. ចុចសញ្ញា (⋮) នៅខាងលើស្តាំ\n2. ជ្រើសរើសយក 'Open in browser'\n3. ចុចប៊ូតុង Print ម្ដងទៀតក្នុង Browser!");
                      }
                    });
                  } else {
                    if (setPrintingOrder) setPrintingOrder(o);
                    setTimeout(() => window.print(), 300);
                  }
                }}>🖨️</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default AdminOrdersTab;
