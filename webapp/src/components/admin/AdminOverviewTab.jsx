import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminOverviewTab = React.memo(({ summary, paddedDailyAnalytics, advancedAnalytics, orders, statusTags }) => (
  <div className="tab-pane-animate">
    <div className="admin-responsive-grid" style={{ gap: 15, marginBottom: 25 }}>
      <div className="glass-card-luxury" style={{ padding: '20px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>💰 ចំណូលសរុប</div>
        <div style={{ fontSize: 26, fontWeight: 950 }}>${summary.totalRevenue.toLocaleString()}</div>
      </div>
      <div className="glass-card-luxury" style={{ padding: '20px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>🎫 កម្មង់កំពុងដើរ</div>
        <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.activeOrders}</div>
      </div>
      <div className="glass-card-luxury" style={{ padding: '20px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>👤 អតិថិជន</div>
        <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.totalCustomers}</div>
      </div>
      <div className="glass-card-luxury" style={{ padding: '20px' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>✨ សុខភាពហាង</div>
        <div style={{ fontSize: 26, fontWeight: 950 }}>{summary.businessHealth}%</div>
      </div>
    </div>

    <div className="glass-card-luxury" style={{ marginBottom: 25, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📈</span> <span>ការវិភាគស៊ីជម្រៅ</span>
      </div>

      <div style={{ marginBottom: 25, background: 'var(--bg-soft)', padding: 15, borderRadius: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>កំណើនចំណូល (14 ថ្ងៃចុងក្រោយ)</div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={paddedDailyAnalytics}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
              <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text-luxury)' }}
                itemStyle={{ color: 'var(--text-main)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#ffffff" fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginBottom: 25, background: 'var(--bg-soft)', padding: 15, borderRadius: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.6, marginBottom: 10 }}>ចំនួនកម្ម៉ង់ (14 ថ្ងៃចុងក្រោយ)</div>
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={paddedDailyAnalytics}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--glass-border)" />
              <XAxis dataKey="dateShort" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--glass-card)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text-luxury)' }}
                itemStyle={{ color: 'var(--text-main)', fontWeight: 900 }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="orders" fill="#ffffff" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg-soft)', padding: 15, borderRadius: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.6, marginBottom: 5 }}>តម្លៃមធ្យមក្នុងមួយកម្មង់</div>
          <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--text-main)' }}>${advancedAnalytics.aov?.aov?.toFixed(2) || '0.00'}</div>
          <div style={{ fontSize: 10, color: 'var(--text-main)', marginTop: 4 }}>30 ថ្ងៃចុងក្រោយ: ${advancedAnalytics.aov?.aov_30d?.toFixed(2) || '0.00'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 5 }}>🔥 ទំនិញលក់ដាច់បំផុត</div>
          {(advancedAnalytics.topProducts || []).map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}>
              <span style={{ fontWeight: 800 }}>{i + 1}. {p.product_name}</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 900 }}>x{p.total_quantity}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 5 }}>👑 អតិថិជនឆ្នើម</div>
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
      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 15 }}>🛍️ កម្ម៉ង់ថ្មីៗ</div>
      {orders.slice(0, 3).map(o => (
        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{o.user_name}</div>
            <div className="ticket-id-luxury" style={{ fontSize: 9, padding: '2px 6px', marginTop: 4 }}>{o.order_code || `#MO-${o.id}`}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>${parseFloat(o.total).toFixed(2)}</div>
            <div style={{ fontSize: 9, color: 'var(--text-main)', fontWeight: 800 }}>{(statusTags[o.status] || {}).label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
));

export default AdminOverviewTab;
