import React, { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { useQuery } from '../../hooks/useQuery';
import { useUser } from '../../context/UserContext';

const PIE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#f43f5e', '#10b981', '#a78bfa', '#fb923c'];
const CHART_GREEN = '#10b981';
const CHART_ACCENT = '#f59e0b';

const CHART_TOOLTIP_STYLE = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 14,
  color: 'var(--text-bold)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  fontSize: 12,
};

function SectionHeader({ title, badge }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="font-bold text-sm" style={{ color: 'var(--text-bold)' }}>{title}</div>
      {badge && (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function MetricRow({ rank, label, value, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-black w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between mb-1">
          <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-bold)' }}>{label}</span>
          <span className="text-[11px] font-bold shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{value}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
const AdminAnalyticsTab = React.memo(({ BACKEND_URL, headers, summary }) => {
  const { lang } = useUser();

  const { data: extendedData, loading } = useQuery(
    'admin-analytics-30d',
    `${BACKEND_URL}/api/admin/analytics`,
    { headers, revalidateOnMount: true }
  );

  const monthlyData = useMemo(() => {
    const raw = extendedData?.monthly || [];
    return raw.map(d => ({
      ...d,
      revenue: parseFloat(d.revenue || 0),
      orders: parseInt(d.orders || 0),
    }));
  }, [extendedData]);

  const categoryData = useMemo(() => extendedData?.categoryRevenue || [], [extendedData]);
  const provinceData = useMemo(() => extendedData?.provinceRevenue || [], [extendedData]);
  const revenueByStatus = useMemo(() => extendedData?.revenueByStatus || [], [extendedData]);

  // Completion Rate
  const completionRate = useMemo(() => {
    const total = revenueByStatus.reduce((acc, s) => acc + parseInt(s.count || 0), 0);
    if (!total) return 0;
    const bad = parseInt(revenueByStatus.find(s => s.status === 'cancelled')?.count || 0);
    return (((total - bad) / total) * 100).toFixed(1);
  }, [revenueByStatus]);

  // Revenue from delivered orders
  const deliveredRevenue = useMemo(() => {
    return revenueByStatus
      .filter(s => s.status === 'delivered' || s.status === 'completed')
      .reduce((acc, s) => acc + parseFloat(s.revenue || 0), 0);
  }, [revenueByStatus]);

  // Delivery fee collected estimate (from orders)
  const totalDeliveryFees = useMemo(() => extendedData?.totalDeliveryFees || 0, [extendedData]);

  // Order status for Pie chart
  const statusPieData = useMemo(() =>
    revenueByStatus
      .filter(s => s.count > 0)
      .map(s => ({ name: s.status, value: parseInt(s.count) })),
    [revenueByStatus]
  );

  const isLoading = loading && !extendedData;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="loader" style={{ borderColor: 'var(--primary-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="tab-pane-animate pb-8 space-y-4">

      {/* ── Business Health KPIs (unique to Analytics) ── */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <SectionHeader title={lang === 'kh' ? 'សុខភាពអាជីវកម្ម' : 'Business Health'} />
        <div className="grid grid-cols-2 gap-3">
          {/* Completion Rate */}
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-2xl font-black"
              style={{ color: parseFloat(completionRate) >= 80 ? CHART_GREEN : CHART_ACCENT }}>
              {completionRate}%
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {lang === 'kh' ? 'អត្រាបញ្ចប់' : 'Completion Rate'}
            </div>
          </div>
          {/* Delivered Revenue */}
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-soft)' }}>
            <div className="text-2xl font-black" style={{ color: CHART_GREEN }}>
              ${parseFloat(deliveredRevenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {lang === 'kh' ? 'ចំណូលពិតប្រាកដ' : 'Confirmed Revenue'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Revenue Trend ── */}
      {monthlyData.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <SectionHeader
            title={lang === 'kh' ? 'ចំណូល + ការបញ្ជាទិញ ប្រចាំខែ' : 'Monthly Revenue & Orders'}
            badge="6 months" />
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" opacity={0.5} />
                <XAxis dataKey="month" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700 }} dy={4} />
                <YAxis yAxisId="rev" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700 }}
                  tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="ord" orientation="right" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 700 }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(v, name) => name === 'revenue' ? [`$${parseFloat(v).toFixed(2)}`, 'Revenue'] : [v, 'Orders']} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="#6366f1"
                  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="#22d3ee"
                  strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" name="orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Order Status Distribution (Pie) ── */}
      {statusPieData.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <SectionHeader title={lang === 'kh' ? 'ការបែងចែកតាម Status' : 'Order Status Breakdown'} />
          <div className="flex gap-4 items-center">
            <div style={{ width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={58} innerRadius={32} paddingAngle={3}>
                    {statusPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0">
              {statusPieData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[11px] truncate capitalize" style={{ color: 'var(--text-muted)' }}>{s.name}</span>
                  <span className="text-[11px] font-bold ml-auto shrink-0" style={{ color: 'var(--text-bold)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Revenue by Category ── */}
      {categoryData.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <SectionHeader title={lang === 'kh' ? 'ចំណូលតាមប្រភេទទំនិញ' : 'Revenue by Category'} />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 50, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false}
                  tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                  tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="category" axisLine={false} tickLine={false} width={70}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={v => [`$${parseFloat(v).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={14}>
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Province Breakdown ── */}
      {provinceData.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <SectionHeader title={lang === 'kh' ? 'ចំណូលតាមខេត្ត/ក្រុង' : 'Revenue by Province'} />
          <div className="space-y-2.5">
            {provinceData.slice(0, 8).map((prov, i) => {
              const max = parseFloat(provinceData[0]?.revenue || 1);
              return (
                <MetricRow
                  key={prov.province}
                  rank={i + 1}
                  label={prov.province || 'Unknown'}
                  value={`$${parseFloat(prov.revenue).toFixed(2)} · ${prov.orders} orders`}
                  pct={Math.round((parseFloat(prov.revenue) / max) * 100)}
                  color={PIE_COLORS[i % PIE_COLORS.length]}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && monthlyData.length === 0 && categoryData.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-3">📊</div>
          <div className="font-semibold">{lang === 'kh' ? 'មិនទាន់មានទិន្នន័យ' : 'No analytics data yet'}</div>
          <div className="text-xs mt-1">{lang === 'kh' ? 'ទិន្នន័យនឹងបង្ហាញពេលមានការបញ្ជាទិញ' : 'Data appears once orders are placed'}</div>
        </div>
      )}

    </div>
  );
});

export default AdminAnalyticsTab;
