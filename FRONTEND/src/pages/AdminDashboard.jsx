import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Wrench, CheckCircle,
  Activity, ArrowUpRight, X, Download, FileText
} from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { generatePDFReport } from '../utils/pdfReport.js';

/** ── Animation ── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } } };

const CHART_DATA = [
  { day: 'Mon', revenue: 14200, repairs: 6 },
  { day: 'Tue', revenue: 18700, repairs: 9 },
  { day: 'Wed', revenue: 12300, repairs: 5 },
  { day: 'Thu', revenue: 22100, repairs: 11 },
  { day: 'Fri', revenue: 19400, repairs: 8 },
  { day: 'Sat', revenue: 26500, repairs: 14 },
  { day: 'Sun', revenue: 11800, repairs: 4 },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const Toast = ({ msg, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
      background: 'var(--bg-surface-2)', border: '1px solid var(--border-2)',
      borderRadius: 14, padding: '1rem 1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
      backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      maxWidth: 380,
    }}
  >
    <span style={{ fontSize: '0.9rem', color: 'var(--text-1)', flex: 1 }}>{msg}</span>
    <button className="btn btn-ghost" onClick={onClose}
      style={{ padding: '0.25rem', minWidth: 0, borderRadius: 8, flexShrink: 0 }}>
      <X size={14} />
    </button>
  </motion.div>
);

const Modal = ({ title, children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}
  >
    <motion.div
      initial={{ scale: 0.93, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.93, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      className="card"
      style={{ width: '100%', maxWidth: 520, padding: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="display" style={{ fontSize: '1.2rem' }}>{title}</h2>
        <button className="btn btn-ghost" onClick={onClose}
          style={{ padding: '0.35rem', minWidth: 0, borderRadius: 8 }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

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

// ── Main Component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { tickets, customers, getStats } = useData();

  const liveStats = getStats();
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // 'report' | 'log'
  const [reportForm, setReportForm] = useState({
    type: 'Revenue Summary', from: '2026-05-01', to: new Date().toISOString().split('T')[0],
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  /** Export raw CSV of all tickets */
  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'Customer', 'Device', 'Issue', 'Status', 'Date'];
    const rows = tickets.map(t => [t.id, t.customerName, `"${t.device}"`, `"${t.issue}"`, t.status, t.date]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `comprepair_tickets_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Tickets exported as CSV.');
  };

  /** Generate a proper formatted PDF report */
  const handleGeneratePDF = () => {
    setModal(null);
    generatePDFReport({
      type:      reportForm.type,
      fromDate:  reportForm.from,
      toDate:    reportForm.to,
      tickets,
      customers,
      stats:     liveStats,
    });
    showToast('📄 PDF report opened in new tab — use Print → Save as PDF.');
  };

  // Build activity log from real ticket activity
  const recentActivity = tickets
    .flatMap(t => (t.activityLog ?? []).map(a => ({ ...a, ticketId: t.id })))
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8);

  const logColor = (action) => {
    if (action.includes('Completed')) return 'var(--success)';
    if (action.includes('In Progress')) return 'var(--primary)';
    if (action.includes('Awaiting'))  return 'var(--warning)';
    if (action.includes('created'))   return 'var(--accent)';
    return 'var(--text-3)';
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="page-header">
          <div>
            <h1 className="page-title gradient-text">Operations Hub</h1>
            <p className="page-subtitle">Live system metrics and activity</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.button id="btn-export-csv" className="btn btn-ghost"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={handleExportCSV} style={{ gap: '0.4rem' }}>
              <Download size={15} /> Export CSV
            </motion.button>
            <motion.button id="btn-generate-report" className="btn btn-primary"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => setModal('report')} style={{ gap: '0.4rem' }}>
              <FileText size={15} /> Generate Report
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Row — live data from DataContext */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          <KpiCard title="Net Revenue"   value="₱124,500"                  trend="+14.5%" trendUp icon={<TrendingUp size={22} />} color="var(--success)" />
          <KpiCard title="Total Clients" value={String(customers.length)}   trend="+5.2%"  trendUp icon={<Users size={22} />}      color="var(--primary)" />
          <KpiCard title="In Progress"   value={String(liveStats.inProgress)}              icon={<Wrench size={22} />}            color="var(--accent)" />
          <KpiCard title="Completed"     value={String(liveStats.completed)} trend="+12%"  trendUp icon={<CheckCircle size={22} />} color="var(--success)" />
        </motion.div>

        {/* Chart + Log */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '1.5rem' }}>
          {/* Chart */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 className="display" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Revenue Overview</h3>
                <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>7-day performance window</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--success)' }}>
                <div className="live-dot" /> Live
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--success)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0}    />
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

          {/* Activity Log — real data from tickets */}
          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="display" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>System Log</h3>
              <Activity size={18} color="var(--text-3)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
              {recentActivity.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>No recent activity.</p>
              ) : recentActivity.map((entry, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: logColor(entry.action),
                    boxShadow: `0 0 8px ${logColor(entry.action)}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem', gap: '0.5rem' }}>
                      <span className="mono" style={{ fontSize: '0.75rem', color: logColor(entry.action), whiteSpace: 'nowrap' }}>{entry.ticketId}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{entry.time.split(' ')[1]}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{entry.action}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>by {entry.by}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button id="btn-view-full-log" className="btn btn-ghost"
              whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={() => setModal('log')}
              style={{ marginTop: '1.5rem', width: '100%', gap: '0.5rem' }}>
              View Full Log <ArrowUpRight size={16} />
            </motion.button>
          </div>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
          {[
            { label: 'Received (Pending)',  value: tickets.filter(t => t.status === 'Received').length,       color: 'var(--text-2)' },
            { label: 'Awaiting Parts',      value: tickets.filter(t => t.status === 'Awaiting Parts').length, color: 'var(--warning)' },
            { label: 'Total All-Time',      value: tickets.length,                                            color: 'var(--accent)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{label}</span>
              <span className="display" style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal === 'report' && (
          <Modal title="Generate PDF Report" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Configure and generate a formatted PDF report. The report will open in a new tab — use <strong>Print → Save as PDF</strong>.
              </p>
              <div>
                <label className="label">Report Type</label>
                <select className="input" style={{ fontFamily: 'var(--font-display)' }}
                  value={reportForm.type}
                  onChange={e => setReportForm(f => ({ ...f, type: e.target.value }))}>
                  <option>Revenue Summary</option>
                  <option>Repair Volume Report</option>
                  <option>Client Activity Report</option>
                  <option>Technician Performance</option>
                  <option>Full System Report</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">From Date</label>
                  <input type="date" className="input" value={reportForm.from}
                    onChange={e => setReportForm(f => ({ ...f, from: e.target.value }))} />
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input type="date" className="input" value={reportForm.to}
                    onChange={e => setReportForm(f => ({ ...f, to: e.target.value }))} />
                </div>
              </div>
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 8,
                background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
                fontSize: '0.8rem', color: 'var(--text-2)',
              }}>
                📊 This report will include <strong style={{ color: 'var(--primary)' }}>
                  {tickets.filter(t => {
                    const d = new Date(t.date);
                    const f = reportForm.from ? new Date(reportForm.from) : null;
                    const to = reportForm.to   ? new Date(reportForm.to)   : null;
                    return (!f || d >= f) && (!to || d <= to);
                  }).length} tickets
                </strong> and <strong style={{ color: 'var(--primary)' }}>{customers.length} clients</strong>.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <motion.button className="btn btn-primary" style={{ flex: 1, gap: '0.4rem' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={handleGeneratePDF}>
                  <FileText size={15} /> Generate PDF
                </motion.button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {modal === 'log' && (
          <Modal title="Full Activity Log" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {tickets
                .flatMap(t => (t.activityLog ?? []).map(a => ({ ...a, ticketId: t.id, device: t.device })))
                .sort((a, b) => b.time.localeCompare(a.time))
                .map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: '0.875rem', alignItems: 'flex-start',
                    padding: '0.75rem', borderRadius: 10,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-1)',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: logColor(entry.action), boxShadow: `0 0 6px ${logColor(entry.action)}` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{entry.ticketId}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>{entry.time}</span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-1)', marginTop: '0.15rem' }}>{entry.action}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>by {entry.by} · {entry.device}</p>
                    </div>
                  </div>
                ))}
            </div>
            <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ width: '100%', marginTop: '1rem' }}>Close</button>
          </Modal>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
};

const KpiCard = ({ title, value, trend, trendUp, icon, color }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${color}22` }}
    className="card"
    style={{ padding: '1.5rem', cursor: 'default', transition: 'box-shadow 0.3s' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
      <div style={{ padding: '0.6rem', background: `${color}18`, borderRadius: 10, color }}>{icon}</div>
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
