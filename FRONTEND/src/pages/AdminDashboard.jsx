import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Wrench, CheckCircle, Activity, ArrowUpRight } from 'lucide-react';
import { dashboardAPI } from '../services/api.js';
import useAsync from '../hooks/useAsync.js';
import { SkeletonCard } from '../components/SkeletonLoader.jsx';
import ApiError from '../components/ApiError.jsx';

/** ── Stagger container ── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show:  { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
};

/** ── Fallback mock data (removed when backend is live) ── */
const MOCK_STATS = {
  revenue:       { value: '₱124,500', trend: '+14.5%', up: true },
  clients:       { value: '842',       trend: '+5.2%',  up: true },
  inProgress:    { value: '18',        trend: null },
  completed:     { value: '42',        trend: '+12%',   up: true },
};

const MOCK_CHART = [
  { day: 'Mon', revenue: 14200, repairs: 6 },
  { day: 'Tue', revenue: 18700, repairs: 9 },
  { day: 'Wed', revenue: 12300, repairs: 5 },
  { day: 'Thu', revenue: 22100, repairs: 11 },
  { day: 'Fri', revenue: 19400, repairs: 8 },
  { day: 'Sat', revenue: 26500, repairs: 14 },
  { day: 'Sun', revenue: 11800, repairs: 4 },
];

const MOCK_LOG = [
  { id: 'RT-1042', action: 'Repair cycle completed',  time: '10m ago', color: 'var(--success)' },
  { id: 'CUST-89', action: 'New client registered',   time: '1h ago',  color: 'var(--primary)' },
  { id: 'RT-1045', action: 'Awaiting components',     time: '2h ago',  color: 'var(--warning)' },
  { id: 'PAY-109', action: 'Payment confirmed',        time: '5h ago',  color: 'var(--success)' },
  { id: 'TECH-03', action: 'Tech session started',    time: '8h ago',  color: 'var(--accent)' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-2)', fontSize: '0.8rem' }}>
      <p style={{ color: 'var(--text-2)', marginBottom: '0.25rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>{label}</p>
      <p style={{ color: 'var(--primary)', fontWeight: 700 }}>₱{payload[0]?.value?.toLocaleString()}</p>
      <p style={{ color: 'var(--success)' }}>{payload[1]?.value} repairs</p>
    </div>
  );
};

const AdminDashboard = () => {
  // ── Backend integration point ────────────────────────────────────────────
  // const { data: stats, loading, error, execute } = useAsync(dashboardAPI.getStats);
  // const { data: chart } = useAsync(dashboardAPI.getRevenueChart);
  // const { data: log }   = useAsync(dashboardAPI.getActivity);
  //
  // Use mock data during frontend-only phase:
  const stats   = MOCK_STATS;
  const chart   = MOCK_CHART;
  const log     = MOCK_LOG;
  const loading = false;
  const error   = null;
  // ─────────────────────────────────────────────────────────────────────────

  if (error) return <ApiError message={error} />;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={item} className="page-header">
        <div>
          <h1 className="page-title gradient-text">Operations Hub</h1>
          <p className="page-subtitle">Real-time telemetry and system metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost">Export</button>
          <button className="btn btn-primary">Generate Report</button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {loading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard title="Net Revenue" value={stats.revenue.value} trend={stats.revenue.trend} trendUp={stats.revenue.up} icon={<TrendingUp size={22} />} color="var(--success)" />
            <KpiCard title="Total Clients" value={stats.clients.value} trend={stats.clients.trend} trendUp={stats.clients.up} icon={<Users size={22} />} color="var(--primary)" />
            <KpiCard title="In Progress" value={stats.inProgress.value} icon={<Wrench size={22} />} color="var(--accent)" />
            <KpiCard title="Completed" value={stats.completed.value} trend={stats.completed.trend} trendUp={stats.completed.up} icon={<CheckCircle size={22} />} color="var(--success)" />
          </>
        )}
      </motion.div>

      {/* Chart + Log row */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
        {/* Area Chart */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 className="display" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Revenue Overview</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>7-day performance window</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--success)' }}>
              <div className="live-dot" />
              Live
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart ?? []} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="var(--success)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--font-display)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="repairs" stroke="var(--success)" strokeWidth={2} fill="url(#repGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Log */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 className="display" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>System Log</h3>
            <Activity size={18} color="var(--text-3)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {(log ?? []).map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  background: entry.color,
                  boxShadow: `0 0 8px ${entry.color}`,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <span className="mono" style={{ fontSize: '0.8rem', color: entry.color }}>{entry.id}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{entry.time}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{entry.action}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <button className="btn btn-ghost" style={{ marginTop: '1.5rem', width: '100%', gap: '0.5rem' }}>
            View Full Log <ArrowUpRight size={16} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const KpiCard = ({ title, value, trend, trendUp, icon, color }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${color}22` }}
    className="card"
    style={{ padding: '1.5rem', cursor: 'default', transition: 'box-shadow 0.3s' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
      <div style={{ padding: '0.6rem', background: `${color}18`, borderRadius: 10, color }}>
        {icon}
      </div>
      {trend && (
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)',
          color: trendUp ? 'var(--success)' : 'var(--warning)',
          display: 'flex', alignItems: 'center', gap: '0.2rem',
        }}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</p>
    <p className="stat-value">{value ?? '—'}</p>
  </motion.div>
);

export default AdminDashboard;
