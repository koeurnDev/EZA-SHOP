import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';
import { useTelegram } from '../../context/TelegramContext';
import { getOptimizedThumbUrl, resolveItemImageUrl } from '../../utils/imageUtils';
import { extractOrderItemSpecs, formatSpecsForCopy, getVariantLabels } from '../../utils/orderItemUtils';

// ─── Variant badge themes ────────────────────────────────────────────────────
const BADGE_THEMES = {
  size:    { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6' },
  color:   { bg: 'rgba(236,72,153,0.15)', color: '#ec4899' },
  weight:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  height:  { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
  variant: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
};

// ─── Courier color themes ────────────────────────────────────────────────────
const COURIER_THEME = {
  grab:   { color: '#fff',    bg: '#00b14f', label: '🛵 GrabExpress' },
  virak:  { color: '#fff',    bg: '#1d4ed8', label: '🚌 Virak Buntham' },
  jnt:    { color: '#fff',    bg: '#e11d48', label: '📦 J&T Express' },
  other:  { color: 'var(--text-bold)', bg: 'var(--bg-soft)', label: null },
};

const getCourierTheme = (name) => {
  if (!name) return null;
  const low = name.toLowerCase();
  if (low.includes('grab')) return COURIER_THEME.grab;
  if (low.includes('virak') || low.includes('វីរៈ') || low.includes('buntham')) return COURIER_THEME.virak;
  if (low.includes('j&t') || low.includes('jnt') || low.includes('j and t')) return COURIER_THEME.jnt;
  return { ...COURIER_THEME.other, label: `🚚 ${name}` };
};

const CourierBadge = ({ name }) => {
  const theme = getCourierTheme(name);
  if (!theme) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 900,
      background: theme.bg,
      color: theme.color,
      whiteSpace: 'nowrap',
      marginTop: 4,
    }}>
      {theme.label || `🚚 ${name}`}
    </span>
  );
};
const STATUS_THEME = {
  pending:    { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: { kh: '⏳ រង់ចាំបង់',       en: '⏳ Awaiting payment' } },
  paid:       { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: { kh: '✅ បញ្ជាក់ — រៀបចំ', en: '✅ Confirmed — pack' } },
  processing: { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', label: { kh: '📦 កំពុងរៀបចំ',      en: '📦 Packing' } },
  shipped:    { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: { kh: '🚚 ប្រគល់ជូនអ្នកដឹក', en: '🚚 With courier' } },
  delivering: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: { kh: '🚚 ប្រគល់ជូនអ្នកដឹក', en: '🚚 With courier' } },
  delivered:  { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: { kh: '🚚 ប្រគល់ជូនអ្នកដឹក', en: '🚚 With courier' } },
  completed:  { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: { kh: '🎉 ទទួលបានជោគជ័យ',  en: '🎉 Completed' } },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: { kh: '❌ បានបោះបង់',       en: '❌ Cancelled' } },
  expired:    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: { kh: '⌛ ផុតកំណត់',        en: '⌛ Expired' } },
};

const getStatusTheme = (status) => STATUS_THEME[status] || STATUS_THEME.pending;

// ─── Sub-components ──────────────────────────────────────────────────────────
const OrderItemVariantBadges = ({ item, lang = 'kh', style = {} }) => {
  const specs = extractOrderItemSpecs(item);
  const labels = getVariantLabels(lang, {
    category: item?.category || '',
    productName: item?.name || item?.product_name || '',
    sizeValue: specs.size
  });
  const rows = [
    ['size', specs.size],
    ['color', specs.color],
    ['weight', specs.weight],
    ['height', specs.height],
    ['variant', specs.variant && !specs.size && !specs.color ? specs.variant : '']
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, ...style }}>
      {rows.map(([key, value]) => {
        const theme = BADGE_THEMES[key];
        return (
          <span key={key} style={{ background: theme.bg, color: theme.color, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' }}>
            {labels[key]}: {value}
          </span>
        );
      })}
    </div>
  );
};

const PackCheckbox = ({ checked }) => (
  <span aria-hidden="true" style={{
    width: 18, height: 18, borderRadius: 5,
    border: `2px solid ${checked ? '#10b981' : '#cbd5e1'}`,
    background: checked ? '#10b981' : '#fff',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1
  }}>
    {checked ? '✓' : ''}
  </span>
);

const OrderItemThumb = ({ item, productById }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const name = item?.name || item?.product_name || '';
  const initial = name ? name.charAt(0).toUpperCase() : '📦';
  const rawUrl = resolveItemImageUrl(item, productById);
  const src = rawUrl ? getOptimizedThumbUrl(rawUrl, 80) : '';
  const showPhoto = src && !imgFailed;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
      background: showPhoto ? 'var(--bg-soft)' : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 900, color: '#64748b', border: '1px solid var(--border-subtle)'
    }}>
      {showPhoto
        ? <img src={src} alt="" referrerPolicy="no-referrer" loading="eager" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgFailed(true)} />
        : initial}
    </div>
  );
};

// ─── Status summary pill ──────────────────────────────────────────────────────
const StatusPill = ({ label, count, active, onClick, color, bg }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '8px 12px', borderRadius: 12, border: `1.5px solid ${active ? color : 'var(--border-subtle)'}`,
      background: active ? bg : 'var(--bg-soft)', cursor: 'pointer',
      minWidth: 60, flex: '1 1 0', transition: 'all 0.15s ease'
    }}
  >
    <span style={{ fontSize: 16, fontWeight: 950, color: active ? color : 'var(--text-bold)', lineHeight: 1 }}>{count}</span>
    <span style={{ fontSize: 9, fontWeight: 800, color: active ? color : 'var(--text-muted)', marginTop: 3, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</span>
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminOrdersTab = React.memo(({
  orders, searchTerm, orderFilter, setOrderFilter,
  localSearchTerm, setLocalSearchTerm,
  updateStatus, setPrintingOrder, statusTags,
  trackingNumbers = {}, setTrackingNumbers,
  products = []
}) => {
  const { t, lang } = useUser();
  const { showPopup, showAlert, tg } = useTelegram();
  const [sortDirection, setSortDirection] = React.useState('newest');
  const [checkedItems, setCheckedItems] = React.useState({});
  const [courierFilter, setCourierFilter] = React.useState('all');
  const [showPickList, setShowPickList] = React.useState(false);
  const [expandedReceipts, setExpandedReceipts] = React.useState({});

  const toggleReceipt = (id) => setExpandedReceipts(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCheckItem = (orderId, idx) => {
    const key = `${orderId}_${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const productById = useMemo(() => {
    const map = new Map();
    (products || []).forEach(p => { if (p?.id != null) map.set(String(p.id), p); });
    return map;
  }, [products]);

  // ── Helper to normalize courier names for legacy orders ──────────────────
  const normalizeCourier = (name) => {
    if (!name) return '';
    const low = name.toLowerCase();
    if (low.includes('grab')) return 'GrabExpress (ហ្រ្គេប)';
    if (low.includes('virak') || low.includes('វីរៈ') || low.includes('buntham')) return 'Virak Buntham (វីរៈ ប៊ុនថាំ)';
    if (low.includes('j&t') || low.includes('j and t') || low.includes('jnt') || low.includes('j&t express')) return 'J&T Express';
    return name;
  };

  // ── Counts & courier options ─────────────────────────────────────────────
  const { counts, phoneCounts, courierOptions, grabCount } = useMemo(() => {
    let pending = 0, toPack = 0, shipped = 0, cancelled = 0, grabC = 0;
    const phoneMap = {};
    orders.forEach(o => {
      if (o.status === 'pending') pending++;
      if (['paid', 'processing'].includes(o.status)) toPack++;
      if (['shipped', 'delivering', 'delivered', 'completed'].includes(o.status)) shipped++;
      if (['cancelled', 'expired'].includes(o.status)) cancelled++;
      
      const c = normalizeCourier(o.delivery_company);
      if (c === 'GrabExpress (ហ្រ្គេប)' && ['paid', 'processing'].includes(o.status)) grabC++;
      
      if (o.phone && ['paid', 'processing', 'pending'].includes(o.status))
        phoneMap[o.phone] = (phoneMap[o.phone] || 0) + 1;
    });
    
    const cOptions = [
      { value: 'all', label: '🚚 គ្រប់ក្រុមហ៊ុន' },
      { value: 'J&T Express', label: '🚚 J&T Express' },
      { value: 'Virak Buntham (វីរៈ ប៊ុនថាំ)', label: '🚚 Virak Buntham (វីរៈ ប៊ុនថាំ)' },
      { value: 'GrabExpress (ហ្រ្គេប)', label: '🚚 GrabExpress (ហ្រ្គេប)' }
    ];
    
    return { counts: { pending, toPack, shipped, cancelled }, phoneCounts: phoneMap, courierOptions: cOptions, grabCount: grabC };
  }, [orders]);

  // ── Filtered + sorted list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = orders.filter(o => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q ||
        (o.user_name || '').toLowerCase().includes(q) ||
        (o.order_code || '').toLowerCase().includes(q) ||
        (o.phone || '').toLowerCase().includes(q);
      
      const c = normalizeCourier(o.delivery_company);
      const matchesCourier = courierFilter === 'all' || c === courierFilter;
      
      if (!matchesCourier || !matchesSearch) return false;

      if (orderFilter === 'pending')    return o.status === 'pending';
      if (orderFilter === 'processing') return ['paid', 'processing'].includes(o.status);
      if (orderFilter === 'shipped')    return ['shipped', 'delivering', 'delivered', 'completed'].includes(o.status);
      if (orderFilter === 'cancelled')  return ['cancelled', 'expired'].includes(o.status);
      // 'all' shows everything
      return true;
    });
    return list.sort((a, b) => {
      const tA = new Date(a.created_at || 0).getTime();
      const tB = new Date(b.created_at || 0).getTime();
      return sortDirection === 'oldest' ? tA - tB : tB - tA;
    });
  }, [orders, searchTerm, orderFilter, courierFilter, sortDirection]);

  // ── Batch pick summary ────────────────────────────────────────────────────
  const batchPickSummary = useMemo(() => {
    const map = {};
    let totalItemsCount = 0;
    filtered.forEach(o => {
      let items = [];
      try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (e) {}
      items.forEach(it => {
        const name = it.name || it.product_name || 'ទំនិញ';
        const specs = extractOrderItemSpecs(it);
        const qty = Number(it.quantity) || 1;
        const key = `${name}_${specs.size}_${specs.color}_${specs.weight}_${specs.height}_${specs.variant}`;
        if (!map[key]) map[key] = { name, ...specs, totalQty: 0, id: it.id, image: resolveItemImageUrl(it, productById) };
        map[key].totalQty += qty;
        totalItemsCount += qty;
      });
    });
    return { list: Object.values(map), totalItemsCount };
  }, [filtered, productById]);

  // ── Deduplicated print handler ────────────────────────────────────────────
  const handlePrint = (o, items, cleanUserName, fullAddr) => {
    if (tg && ['android', 'ios'].includes(tg.platform) && showPopup) {
      showPopup({
        title: 'Print / Copy ស្លឹកកុម្ម៉ង់',
        message: 'Telegram មិន Print ផ្ទាល់ទេ — ជ្រើសរើស:',
        buttons: [
          { id: 'copy',    type: 'default', text: 'Copy Slip (ចម្លងអត្ថបទ)' },
          { id: 'browser', type: 'default', text: 'Print ពេញលេញក្នុង Browser' },
          { type: 'cancel' }
        ]
      }, (btnId) => {
        if (btnId === 'copy') {
          try {
            const itemsText = items.map(i => {
              const specs = extractOrderItemSpecs(i);
              return `- ${i.name || i.product_name} x${i.quantity || 1}${formatSpecsForCopy(specs, lang, { category: i.category, productName: i.name || i.product_name })}`;
            }).join('\n');
            const slip = [
              `📋 ស្លឹករៀបចំអីវ៉ាន់`,
              `លេខ: ${o.order_code || o.id}`,
              `អតិថិជន: ${cleanUserName}`,
              `📞 ${o.phone || '—'}`,
              `📍 ${fullAddr || '—'}`,
              `🚚 ${normalizeCourier(o.delivery_company) || '—'}`,
              `💬 ${o.note || 'គ្មាន'}`,
              `────────────────`,
              itemsText,
              `────────────────`,
              `សរុប: $${parseFloat(o.total).toFixed(2)}`
            ].join('\n');
            navigator.clipboard.writeText(slip);
            showAlert('បាន Copy Slip ជោគជ័យ!');
          } catch (e) { showAlert('មានបញ្ហាក្នុងការចម្លង!'); }
        } else if (btnId === 'browser') {
          showAlert('ដើម្បី Print:\n1. ចុច (⋮) → Open in browser\n2. ចុច Print');
        }
      });
    } else {
      if (setPrintingOrder) setPrintingOrder(o);
      setTimeout(() => window.print(), 300);
    }
  };

  // ── Status summary pills data ─────────────────────────────────────────────
  const SUMMARY_PILLS = [
    { filter: 'all',        label: lang === 'kh' ? 'ទាំងអស់' : 'All',      count: orders.length,    color: 'var(--text-bold)', bg: 'var(--bg-soft)' },
    { filter: 'pending',    label: lang === 'kh' ? 'រង់ចាំ'   : 'Pending',   count: counts.pending,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { filter: 'processing', label: lang === 'kh' ? 'រៀបចំ'    : 'Packing',   count: counts.toPack,    color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { filter: 'shipped',    label: lang === 'kh' ? 'ដឹក'      : 'Shipped',   count: counts.shipped,   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    { filter: 'cancelled',  label: lang === 'kh' ? 'បោះបង់'  : 'Cancelled', count: counts.cancelled, color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
  ];

  return (
    <div className="tab-pane-animate">

      {/* ── Status Summary Bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        {SUMMARY_PILLS.map(p => (
          <StatusPill key={p.filter} label={p.label} count={p.count}
            active={orderFilter === p.filter} onClick={() => setOrderFilter(p.filter)}
            color={p.color} bg={p.bg} />
        ))}
      </div>

      {/* ── Search & Filters ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            className="input-glass-admin"
            style={{ width: '100%', fontSize: 13, padding: '10px 36px 10px 14px', borderRadius: 12, boxSizing: 'border-box' }}
            placeholder='🔍 ស្វែងរក Order ID / ឈ្មោះ / លេខទូរស័ព្ទ...'
            value={localSearchTerm}
            onChange={e => setLocalSearchTerm(e.target.value)}
          />
          {localSearchTerm && (
            <button onClick={() => setLocalSearchTerm('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 900 }}>
              ✖
            </button>
          )}
        </div>

        {courierOptions.length > 1 && (
          <DarkSelect style={{ width: '100%' }} value={courierFilter} onChange={setCourierFilter} options={courierOptions} />
        )}

        <div className="admin-order-actions-row">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {grabCount > 0 && (
              <button type="button" className="admin-action-pill"
                onClick={() => { setOrderFilter('processing'); setCourierFilter(p => p === 'GrabExpress (ហ្រ្គេប)' ? 'all' : 'GrabExpress (ហ្រ្គេប)'); }}
                style={{ border: courierFilter === 'GrabExpress (ហ្រ្គេប)' ? 'none' : '1px solid #00b14f', background: courierFilter === 'GrabExpress (ហ្រ្គេប)' ? '#00b14f' : 'rgba(0,177,79,0.12)', color: courierFilter === 'GrabExpress (ហ្រ្គេប)' ? '#fff' : '#00b14f' }}>
                🛵 Grab ({grabCount})
              </button>
            )}
            <button type="button" className="admin-action-pill"
              onClick={() => setShowPickList(true)}
              style={{ border: '1px solid #10b981', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              📋 ដកពីឃ្លាំង ({batchPickSummary.totalItemsCount})
            </button>
          </div>
          <button type="button" className="admin-action-pill"
            onClick={() => setSortDirection(p => p === 'newest' ? 'oldest' : 'newest')}
            style={{ background: sortDirection === 'oldest' ? 'rgba(245,158,11,0.2)' : 'var(--bg-soft)', color: sortDirection === 'oldest' ? '#f59e0b' : 'var(--text-muted)', border: sortDirection === 'oldest' ? '1px solid #f59e0b' : '1px solid var(--border-subtle)' }}>
            {sortDirection === 'oldest' ? '⚠️ ចាស់មុន' : '⬇️ ថ្មីមុន'}
          </button>
        </div>
      </div>

      {/* ── Pick List Modal ───────────────────────────────────────────────── */}
      {showPickList && createPortal(
        <div className="admin-dashboard-overhaul admin-picklist-modal-overlay" onClick={() => setShowPickList(false)}>
          <div className="admin-picklist-modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="admin-picklist-modal-header">
              <div className="admin-picklist-modal-title">📦 បញ្ជីទំនិញដកពីឃ្លាំង</div>
              <button type="button" className="admin-picklist-modal-close" onClick={() => setShowPickList(false)} aria-label="Close">✕</button>
            </div>
            <div className="admin-picklist-modal-desc">
              <strong>{filtered.length}</strong> ការកុម្ម៉ង់ · <strong>{batchPickSummary.totalItemsCount} មុខ</strong>
            </div>
            <div className="admin-picklist-modal-list">
              {batchPickSummary.list.length === 0
                ? <div className="admin-picklist-modal-empty">គ្មានទំនិញ</div>
                : batchPickSummary.list.map((it, idx) => (
                  <div key={idx} className="admin-picklist-modal-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <OrderItemThumb item={it} productById={productById} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-bold)' }}>{it.name}</div>
                        <OrderItemVariantBadges item={it} lang={lang} />
                      </div>
                    </div>
                    <div className="admin-picklist-modal-qty">x{it.totalQty}</div>
                  </div>
                ))}
            </div>
            <button type="button" className="admin-picklist-modal-copy"
              onClick={() => {
                const text = `📦 ដកពីឃ្លាំង (${batchPickSummary.totalItemsCount} មុខ):\n` +
                  batchPickSummary.list.map(i => {
                    const specs = extractOrderItemSpecs(i);
                    return `• ${i.name}${formatSpecsForCopy(specs, lang, { category: i.category, productName: i.name })} => x${i.totalQty}`;
                  }).join('\n');
                navigator.clipboard.writeText(text);
                if (showAlert) showAlert('Copy បញ្ជីឃ្លាំងជោគជ័យ!');
              }}>
              📋 Copy បញ្ជី
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Order Cards ───────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700 }}>
          {lang === 'kh' ? 'គ្មានការបញ្ជាទិញ' : 'No orders found'}
        </div>
      )}

      {filtered.map(o => {
        let items = [];
        try { items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []); } catch (e) {}

        const fullAddr = [o.address, o.province].filter(Boolean).join(', ');
        const orderTime = new Date(o.created_at || Date.now());
        const now = new Date();
        const diffHours = Math.floor((now - orderTime) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        const timeLabel = orderTime.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', hour12: true, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        // Urgency tiers: yellow 6h+, orange 12h+, red 24h+
        const isUrgent = diffHours >= 6 && ['paid', 'processing'].includes(o.status);
        const urgencyColor = diffHours >= 24 ? '#ef4444' : diffHours >= 12 ? '#f59e0b' : '#94a3b8';
        const hasMultipleOrders = o.phone && (phoneCounts[o.phone] || 0) > 1;
        const cleanUserName = (o.user_name || '').replace(/\s*-\s*$/, '').trim() || (lang === 'kh' ? 'អតិថិជន' : 'Customer');
        const theme = getStatusTheme(o.status);

        return (
          <div key={o.id}
            className={`glass-card-luxury admin-order-card${o.status === 'cancelled' ? ' admin-order-card--cancelled' : ''}`}
            style={{ borderLeft: isUrgent ? `4px solid ${urgencyColor}` : hasMultipleOrders ? '4px solid #94a3b8' : 'none' }}>

            {/* Header: order code + status badge */}
            <div className="admin-order-card-header">
              <div className="admin-order-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="admin-order-chip admin-order-chip--id">#{o.order_code || o.id}</span>
                {hasMultipleOrders && (
                  <span className="admin-order-chip admin-order-chip--hint">{phoneCounts[o.phone]} {lang === 'kh' ? 'order' : 'linked'}</span>
                )}
                {isUrgent && (
                  <span style={{ fontSize: 10, fontWeight: 900, color: urgencyColor, background: `${urgencyColor}1a`, padding: '2px 7px', borderRadius: 6, border: `1px solid ${urgencyColor}40` }}>
                    ⏰ {diffDays > 0 ? `${diffDays}ថ្ងៃ` : `${diffHours}ម៉`}
                  </span>
                )}
              </div>
              {/* Distinct color badge per status */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8,
                fontSize: 11, fontWeight: 900, background: theme.bg, color: theme.color,
                border: `1px solid ${theme.color}40`, whiteSpace: 'nowrap'
              }}>
                {theme.label[lang === 'kh' ? 'kh' : 'en']}
              </span>
            </div>

            {/* Customer info + total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-bold)' }}>{cleanUserName}</div>
                {o.phone && (
                  <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <a href={`tel:${o.phone}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 800 }}>📞 {o.phone}</a>
                    <button onClick={() => { navigator.clipboard.writeText(o.phone); if (showAlert) showAlert(`Copy ${o.phone}`); }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer', fontWeight: 800 }}>
                      📋
                    </button>
                  </div>
                )}
                {fullAddr && (
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span>📍 {fullAddr}</span>
                    <button onClick={() => { navigator.clipboard.writeText(fullAddr); if (showAlert) showAlert('Copy អាសយដ្ឋាន'); }}
                      style={{ padding: '2px 6px', borderRadius: 6, fontSize: 10, background: 'var(--bg-soft)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: 800 }}>
                      📋
                    </button>
                  </div>
                )}
                {o.delivery_company && (
                  <div style={{ marginTop: 4 }}>
                    <CourierBadge name={normalizeCourier(o.delivery_company)} />
                  </div>
                )}
                {o.tracking_number && (
                  <div style={{ fontSize: 11, marginTop: 3, color: '#a855f7', fontWeight: 800 }}>
                    📦 Tracking: {o.tracking_number}
                  </div>
                )}
                {o.note && (
                  <div style={{ fontSize: 11, color: '#d97706', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 8px', fontWeight: 800, marginTop: 4 }}>
                    💬 {o.note}
                  </div>
                )}
                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3 }}>{timeLabel}</div>
              </div>
              {/* Total + breakdown */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 950, color: 'var(--text-bold)' }}>${parseFloat(o.total).toFixed(2)}</div>
                {parseFloat(o.delivery_fee || 0) > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    🚚 ${parseFloat(o.delivery_fee).toFixed(2)}
                  </div>
                )}
              </div>
            </div>

            {/* Packing checklist */}
            {items.length > 0 && (
              <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📦 {items.length} {lang === 'kh' ? 'មុខ' : 'items'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'kh' ? 'ចុចពេលរៀបចំរួច' : 'Tap to check off'}</span>
                </div>
                {items.map((it, idx) => {
                  const itemKey = `${o.id}_${idx}`;
                  const isChecked = !!checkedItems[itemKey];
                  return (
                    <div key={idx} onClick={() => toggleCheckItem(o.id, idx)}
                      style={{
                        fontSize: 12, fontWeight: 800, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 4, padding: '5px 6px', borderRadius: 8, cursor: 'pointer',
                        background: isChecked ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isChecked ? 'rgba(16,185,129,0.3)' : 'transparent'}`,
                        textDecoration: isChecked ? 'line-through' : 'none',
                        opacity: isChecked ? 0.7 : 1, transition: 'all 0.15s ease'
                      }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <PackCheckbox checked={isChecked} />
                        <OrderItemThumb item={it} productById={productById} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: 'var(--text-bold)', display: 'block', fontSize: 12 }}>{it.name || it.product_name}</span>
                          <OrderItemVariantBadges item={it} lang={lang} style={{ marginTop: 2 }} />
                        </span>
                      </span>
                      <span style={{ fontWeight: 900, color: isChecked ? '#10b981' : '#ec4899', fontSize: 13 }}>x{it.quantity || 1}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment receipt */}
            {o.receipt_url && (
              <div style={{ width: '100%', marginBottom: 10 }}>
                <button onClick={() => toggleReceipt(o.id)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    background: expandedReceipts[o.id] ? 'rgba(59,130,246,0.12)' : 'var(--bg-soft)',
                    color: expandedReceipts[o.id] ? '#3b82f6' : 'var(--text-main)',
                    fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', cursor: 'pointer'
                  }}>
                  <span>🧾 វិក្កយបត្រ ABA / Receipt</span>
                  <span>{expandedReceipts[o.id] ? '▲ បិទ' : '▼ មើល'}</span>
                </button>
                {expandedReceipts[o.id] && (
                  <div style={{ marginTop: 8, textAlign: 'center', background: 'var(--bg-soft)', padding: 10, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                    <img src={o.receipt_url} alt="Receipt"
                      style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => { if (tg?.openLink) tg.openLink(o.receipt_url); else window.open(o.receipt_url, '_blank'); }} />
                  </div>
                )}
              </div>
            )}

            {/* ── Action buttons ──────────────────────────────────────────── */}
            <div className="button-group-pro admin-order-actions" style={{ flexWrap: 'wrap', gap: 6 }}>

              {/* PENDING: confirm payment or reject */}
              {o.status === 'pending' && (
                <div className="admin-order-pending-actions">
                  <button type="button" className="ticket-btn-primary admin-order-btn"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}
                    onClick={() => updateStatus(o.id ?? o.order_code, 'paid')}>
                    ✅ {t('admin_confirm_payment')}
                  </button>
                  <button type="button" className="admin-order-btn admin-order-btn--muted"
                    onClick={() => updateStatus(o.id ?? o.order_code, 'cancelled')}>
                    ❌ {t('admin_not_paid')}
                  </button>
                </div>
              )}

              {/* PAID: advance to packing */}
              {o.status === 'paid' && (
                <button className="ticket-btn-primary admin-order-btn admin-order-btn--blue"
                  style={{ color: '#fff' }}
                  onClick={() => updateStatus(o.id ?? o.order_code, 'processing')}>
                  📦 {lang === 'kh' ? '2. ចាប់ផ្ដើមរៀបចំ' : '2. Start packing'}
                </button>
              )}

              {/* PROCESSING: advance to shipped, tracking input */}
              {o.status === 'processing' && (
                <>
                  {setTrackingNumbers && (
                    <div style={{ width: '100%', marginBottom: 4 }}>
                      <input type="text" className="input-glass-admin admin-order-tracking"
                        placeholder={t('admin_tracking_no') || 'លេខ Tracking (optional)'}
                        value={trackingNumbers[o.id] !== undefined ? trackingNumbers[o.id] : (o.tracking_number || '')}
                        onChange={e => setTrackingNumbers(prev => ({ ...prev, [o.id]: e.target.value }))} />
                    </div>
                  )}
                  <button className="ticket-btn-primary admin-order-btn admin-order-btn--purple"
                    style={{ color: '#fff' }}
                    onClick={() => updateStatus(o.id ?? o.order_code, 'shipped')}>
                    🚚 {lang === 'kh' ? '3. ប្រគល់ជូនអ្នកដឹក' : '3. Hand to courier'}
                  </button>
                </>
              )}

              {/* SHIPPED / DELIVERING / DELIVERED: tracking input + print, no further admin action */}
              {['shipped', 'delivering', 'delivered', 'completed'].includes(o.status) && (
                <div className="admin-order-actions--shipped-only">
                  {setTrackingNumbers && (
                    <input type="text" className="input-glass-admin admin-order-tracking"
                      placeholder={t('admin_tracking_no') || 'លេខ Tracking'}
                      value={trackingNumbers[o.id] !== undefined ? trackingNumbers[o.id] : (o.tracking_number || '')}
                      onChange={e => setTrackingNumbers(prev => ({ ...prev, [o.id]: e.target.value }))} />
                  )}
                  <button className="icon-btn-admin admin-order-print" aria-label="Print"
                    onClick={() => handlePrint(o, items, cleanUserName, fullAddr)}>
                    Print
                  </button>
                </div>
              )}

              {/* Print button for paid/processing */}
              {['paid', 'processing'].includes(o.status) && (
                <button className="icon-btn-admin admin-order-print" aria-label="Print"
                  onClick={() => handlePrint(o, items, cleanUserName, fullAddr)}>
                  Print
                </button>
              )}

              {/* Cancel link for active orders */}
              {['paid', 'processing'].includes(o.status) && (
                <button type="button" className="admin-order-cancel-link"
                  onClick={() => updateStatus(o.id ?? o.order_code, 'cancelled')}>
                  {lang === 'kh' ? 'បោះបង់ការបញ្ជាទិញ' : 'Cancel order'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default AdminOrdersTab;
