import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser } from '../../context/UserContext';
import { useTelegram } from '../../context/TelegramContext';
const AdminOverviewTab = React.memo(({ summary, paddedDailyAnalytics, advancedAnalytics, orders, statusTags, BACKEND_URL }) => {
  const { t } = useUser();
  return (
  <div className="tab-pane-animate">
    <div className="admin-stats-grid">
      <div className="admin-stat-card">
        <div className="stat-label">{t('admin_total_revenue')}</div>
        <div className="stat-value">${summary.totalRevenue.toLocaleString()}</div>
      </div>
      <div className="admin-stat-card">
        <div className="stat-label">{t('admin_active_orders')}</div>
        <div className="stat-value">{summary.activeOrders}</div>
      </div>
      <div className="admin-stat-card">
        <div className="stat-label">{t('admin_total_customers')}</div>
        <div className="stat-value">{summary.totalCustomers}</div>
      </div>
      <div className="admin-stat-card">
        <div className="stat-label">{t('admin_shop_health')}</div>
        <div className="stat-value">{summary.businessHealth}%</div>
      </div>
    </div>

    <div className="glass-card-luxury" style={{ marginBottom: 25, padding: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>
          📈 {t('admin_analytics')}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => {
            const initData = window.Telegram?.WebApp?.initData || '';
            fetch(`${BACKEND_URL}/api/admin/orders/export`, { headers: { 'X-TG-Data': initData } })
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MO-MO_Orders_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              });
          }} className="admin-action-chip">
            📥 {t('admin_export_csv')}
          </button>
          <div className="admin-action-chip admin-action-chip--success">
            <div className="live-dot-pulse" style={{ width: 6, height: 6 }}></div>
            {t('admin_marketing_active')}
          </div>
        </div>
      </div>

      {/* Revenue Area Chart */}
      <div style={{ marginBottom: 25, background: 'var(--bg-soft)', padding: 16, borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>💰 {t('admin_revenue_growth')}</span>
          <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: 10, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>USD</span>
        </div>
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={paddedDailyAnalytics} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
              <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-bold)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                itemStyle={{ color: '#10b981', fontWeight: 900 }}
                formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, t('admin_revenue_label')]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={3} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Bar Chart */}
      <div style={{ marginBottom: 25, background: 'var(--bg-soft)', padding: 16, borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-bold)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📦 {t('admin_orders_chart')}</span>
        </div>
        <div style={{ width: '100%', height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paddedDailyAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.6} />
              <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, color: 'var(--text-bold)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                itemStyle={{ color: '#3b82f6', fontWeight: 900 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value) => [`${value} ${t('admin_orders_label')}`, t('admin_orders_chart')]}
              />
              <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={18} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-soft)', padding: 15, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.6, marginBottom: 5 }}>{t('admin_avg_order_value')}</div>
          <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--text-main)' }}>${advancedAnalytics.aov?.aov?.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 5 }}>🔥 {t('admin_top_products')}</div>
          {(advancedAnalytics.topProducts || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
              <span style={{ fontWeight: 800 }}>{i + 1}. {p.product_name}</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 900 }}>x{p.total_quantity}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 5 }}>👑 {t('admin_top_customers')}</div>
          {(advancedAnalytics.topCustomers || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
              <span style={{ fontWeight: 800 }}>{i + 1}. {c.user_name}</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 900 }}>${parseFloat(c.total_spent).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="glass-card-luxury" style={{ marginBottom: 25 }}>
      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 15 }}>🛍️ {t('admin_tab_orders')}</div>
      {orders.slice(0, 3).map(o => (
        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{o.user_name}</div>
            <div className="ticket-id-luxury" style={{ fontSize: 9, padding: '2px 6px', marginTop: 4, textAlign: 'center' }}>{o.order_code || o.id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>${parseFloat(o.total).toFixed(2)}</div>
            <div style={{ fontSize: 9, color: 'var(--text-main)', fontWeight: 800 }}>{(statusTags[o.status] || {}).label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
});

export default AdminOverviewTab;
