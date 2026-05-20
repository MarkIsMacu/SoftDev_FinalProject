import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, Users, Wrench, CheckCircle, X, Download, FileText,
  RefreshCw, Trash2, Edit2, Search, ShieldCheck, UserCog, Ticket,
  Calendar, AlertCircle, Save,
} from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { generatePDFReport } from '../utils/pdfReport.js';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
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

const ROLE_COLORS = {
  admin:       { color: 'var(--warning)',  bg: 'rgba(255,171,0,0.12)' },
  receptionist:{ color: 'var(--primary)',  bg: 'rgba(0,229,255,0.1)' },
  technician:  { color: 'var(--accent)',   bg: 'rgba(120,80,255,0.12)' },
  customer:    { color: 'var(--success)',  bg: 'rgba(0,230,118,0.1)' },
};

const STATUS_CFG = {
  'Received':       { cls: 'badge-neutral', label: 'Received' },
  'In Progress':    { cls: 'badge-progress', label: 'In Progress' },
  'Awaiting Parts': { cls: 'badge-warning',  label: 'Awaiting Parts' },
  'Completed':      { cls: 'badge-success',  label: 'Completed' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.split('T')[0];
};

// ── Toast ──────────────────────────────────────────────────────────────────────
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
    <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem', minWidth: 0, borderRadius: 8 }}>
      <X size={14} />
    </button>
  </motion.div>
);

// ── Modal ──────────────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose, maxWidth = 520 }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}
  >
    <motion.div
      initial={{ scale: 0.93, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.93, opacity: 0 }}
      onClick={e => e.stopPropagation()}
      className="card"
      style={{ width: '100%', maxWidth, padding: '2rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="display" style={{ fontSize: '1.2rem' }}>{title}</h2>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem', minWidth: 0, borderRadius: 8 }}>
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

const KpiCard = ({ title, value, trend, trendUp, icon, color }) => (
  <motion.div
    whileHover={{ y: -4, boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${color}22` }}
    className="card"
    style={{ padding: '1.5rem', cursor: 'default', transition: 'box-shadow 0.3s' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
      <div style={{ padding: '0.6rem', background: `${color}18`, borderRadius: 10, color }}>{icon}</div>
      {trend && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: trendUp ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      )}
    </div>
    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem', fontWeight: 600 }}>{title}</p>
    <p className="stat-value">{value ?? '—'}</p>
  </motion.div>
);

// ── Admin Dashboard ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const {
    tickets, customers, getStats, refreshStats, refreshTickets,
    allUsers, updateUser, deleteUser, deleteTicket, fetchAllUsers,
  } = useData();

  const liveStats = getStats();
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);   // 'report' | 'editUser' | 'deleteUser' | 'deleteTicket'
  const [refreshing, setRefreshing] = useState(false);
  const [crudTab, setCrudTab] = useState('users');  // 'users' | 'tickets'
  const [userSearch, setUserSearch] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [targetItem, setTargetItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', password: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [reportForm, setReportForm] = useState({
    type: 'Revenue Summary', from: '2026-05-01', to: new Date().toISOString().split('T')[0],
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshTickets(), fetchAllUsers()]).catch(() => {});
    setRefreshing(false);
    showToast('✅ Dashboard refreshed.');
  };

  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'Customer', 'Device', 'Issue', 'Status', 'Date Submitted', 'Date Completed'];
    const rows = tickets.map(t => [
      t.ticketCode ?? t.id,
      t.customerName,
      `"${t.device}"`,
      `"${t.issue}"`,
      t.status,
      fmtDate(t.date),
      t.status === 'Completed' ? fmtDate(t.updatedAt) : 'Pending',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `comprepair_tickets_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('✅ Tickets exported as CSV.');
  };

  const handleGeneratePDF = () => {
    setModal(null);
    generatePDFReport({ type: reportForm.type, fromDate: reportForm.from, toDate: reportForm.to, tickets, customers, stats: liveStats });
    showToast('📄 PDF report opened in new tab — use Print → Save as PDF.');
  };

  // ── User CRUD ──
  const openEditUser = (u) => {
    setTargetItem(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, password: '' });
    setModal('editUser');
  };
  const openDeleteUser = (u) => { setTargetItem(u); setModal('deleteUser'); };

  const handleSaveUser = async () => {
    if (!targetItem) return;
    setEditSaving(true);
    try {
      const payload = {};
      if (editForm.name !== targetItem.name) payload.name = editForm.name;
      if (editForm.email !== targetItem.email) payload.email = editForm.email;
      if (editForm.role !== targetItem.role) payload.role = editForm.role;
      if (editForm.password) payload.password = editForm.password;
      if (Object.keys(payload).length === 0) { setModal(null); return; }
      await updateUser(targetItem.id, payload);
      setModal(null);
      showToast(`✅ ${editForm.name} updated successfully.`);
    } catch (err) {
      showToast(`❌ Update failed: ${err.message}`);
    } finally { setEditSaving(false); }
  };

  const handleDeleteUser = async () => {
    if (!targetItem) return;
    try {
      await deleteUser(targetItem.id);
      setModal(null);
      showToast(`🗑️ User "${targetItem.name}" deleted.`);
    } catch (err) {
      showToast(`❌ Delete failed: ${err.message}`);
    }
  };

  // ── Ticket CRUD ──
  const openDeleteTicket = (t) => { setTargetItem(t); setModal('deleteTicket'); };

  const handleDeleteTicket = async () => {
    if (!targetItem) return;
    try {
      await deleteTicket(targetItem.id);
      setModal(null);
      showToast(`🗑️ Ticket "${targetItem.ticketCode ?? targetItem.id}" deleted.`);
    } catch (err) {
      showToast(`❌ Delete failed: ${err.message}`);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    !userSearch.trim() ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTickets = tickets.filter(t =>
    !ticketSearch.trim() ||
    (t.ticketCode ?? t.id).toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.device?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    t.status?.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show">

        {/* ── Page Header ── */}
        <motion.div variants={item} className="page-header">
          <div>
            <h1 className="page-title gradient-text">Operations Hub</h1>
            <p className="page-subtitle">Live system metrics · User & ticket management</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.button className="btn btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleRefresh}>
              <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8, ease: 'linear' }}>
                <RefreshCw size={16} />
              </motion.div>
            </motion.button>
            <motion.button className="btn btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleExportCSV} style={{ gap: '0.4rem' }}>
              <Download size={15} /> Export CSV
            </motion.button>
            <motion.button className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setModal('report')} style={{ gap: '0.4rem' }}>
              <FileText size={15} /> Generate Report
            </motion.button>
          </div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
          <KpiCard title="Net Revenue"    value="₱124,500"                trend="+14.5%" trendUp icon={<TrendingUp size={22} />} color="var(--success)" />
          <KpiCard title="Total Clients"  value={String(customers.length)} trend="+5.2%"  trendUp icon={<Users size={22} />}     color="var(--primary)" />
          <KpiCard title="In Progress"    value={String(liveStats.inProgress)}             icon={<Wrench size={22} />}     color="var(--accent)"  />
          <KpiCard title="Completed"      value={String(liveStats.completed)} trend="+12%" trendUp icon={<CheckCircle size={22} />} color="var(--success)" />
        </motion.div>

        {/* ── Revenue Chart ── */}
        <motion.div variants={item} className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 className="display" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Revenue Overview</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.85rem', marginTop: '0.25rem' }}>7-day performance window</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--success)' }}>
              <div className="live-dot" /> Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.25} />
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
        </motion.div>

        {/* ── CRUD Management Panel ── */}
        <motion.div variants={item} className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Tab header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-1)', padding: '0 1.5rem', background: 'rgba(0,0,0,0.15)' }}>
            {[
              { key: 'users',   icon: <UserCog size={15} />,  label: `Accounts (${allUsers.length})` },
              { key: 'tickets', icon: <Ticket size={15} />,   label: `Tickets (${tickets.length})` },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setCrudTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '1rem 1.25rem', background: 'none', border: 'none',
                  borderBottom: crudTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: crudTab === tab.key ? 'var(--primary)' : 'var(--text-3)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem',
                  cursor: 'pointer', transition: 'all 0.18s', marginBottom: -1,
                }}>
                {tab.icon} {tab.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '0.6rem 0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                <input className="input"
                  placeholder={crudTab === 'users' ? 'Search accounts…' : 'Search tickets…'}
                  value={crudTab === 'users' ? userSearch : ticketSearch}
                  onChange={e => crudTab === 'users' ? setUserSearch(e.target.value) : setTicketSearch(e.target.value)}
                  style={{ paddingLeft: '2rem', fontSize: '0.8rem', height: 34, width: 220 }} />
              </div>
            </div>
          </div>

          {/* ── Users Table ── */}
          {crudTab === 'users' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style={{ width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No accounts found.</td></tr>
                  ) : filteredUsers.map(u => {
                    const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.customer;
                    return (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${rc.color}44, ${rc.color}22)`, border: `1px solid ${rc.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <ShieldCheck size={13} style={{ color: rc.color }} />
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{u.email}</td>
                        <td>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: rc.color, background: rc.bg, borderRadius: 6, padding: '0.2rem 0.6rem', textTransform: 'capitalize' }}>
                            {u.role}
                          </span>
                        </td>
                        <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{fmtDate(u.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="btn btn-ghost"
                              style={{ padding: '0.3rem 0.55rem', borderRadius: 7, gap: '0.3rem', fontSize: '0.75rem', color: 'var(--primary)' }}
                              onClick={() => openEditUser(u)}>
                              <Edit2 size={13} /> Edit
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="btn btn-ghost"
                              style={{ padding: '0.3rem 0.55rem', borderRadius: 7, gap: '0.3rem', fontSize: '0.75rem', color: 'var(--warning)' }}
                              onClick={() => openDeleteUser(u)}>
                              <Trash2 size={13} /> Delete
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Tickets Table ── */}
          {crudTab === 'tickets' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Client</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th>Date Completed</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No tickets found.</td></tr>
                  ) : filteredTickets.map(t => (
                    <tr key={t.id}>
                      <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>{t.ticketCode ?? t.id}</td>
                      <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{t.device}</td>
                      <td>
                        <span className={`badge ${STATUS_CFG[t.status]?.cls ?? 'badge-neutral'}`}>
                          {STATUS_CFG[t.status]?.label ?? t.status}
                        </span>
                      </td>
                      <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={11} /> {fmtDate(t.date)}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>
                        {t.status === 'Completed' ? (
                          <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle size={11} /> {fmtDate(t.updatedAt)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>Pending</span>
                        )}
                      </td>
                      <td>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem 0.55rem', borderRadius: 7, gap: '0.3rem', fontSize: '0.75rem', color: 'var(--warning)' }}
                          onClick={() => openDeleteTicket(t)}>
                          <Trash2 size={13} /> Delete
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-1)', fontSize: '0.75rem', color: 'var(--text-3)' }}>
            {crudTab === 'users' ? `${filteredUsers.length} of ${allUsers.length} accounts` : `${filteredTickets.length} of ${tickets.length} tickets`}
          </div>
        </motion.div>

        {/* ── Quick Stats Row ── */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginTop: '1.5rem' }}>
          {[
            { label: 'Received (Pending)', value: tickets.filter(t => t.status === 'Received').length,        color: 'var(--text-2)' },
            { label: 'Awaiting Parts',     value: tickets.filter(t => t.status === 'Awaiting Parts').length,  color: 'var(--warning)' },
            { label: 'Total All-Time',     value: tickets.length,                                             color: 'var(--accent)' },
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
        {/* Report Modal */}
        {modal === 'report' && (
          <Modal title="Generate PDF Report" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Configure and generate a formatted PDF report. Opens in new tab — use <strong>Print → Save as PDF</strong>.
              </p>
              <div>
                <label className="label">Report Type</label>
                <select className="input" style={{ fontFamily: 'var(--font-display)' }} value={reportForm.type} onChange={e => setReportForm(f => ({ ...f, type: e.target.value }))}>
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
                  <input type="date" className="input" value={reportForm.from} onChange={e => setReportForm(f => ({ ...f, from: e.target.value }))} />
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input type="date" className="input" value={reportForm.to} onChange={e => setReportForm(f => ({ ...f, to: e.target.value }))} />
                </div>
              </div>
              <div style={{ padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                📊 This report will include <strong style={{ color: 'var(--primary)' }}>
                  {tickets.filter(t => { const d = new Date(t.date); const f = reportForm.from ? new Date(reportForm.from) : null; const to = reportForm.to ? new Date(reportForm.to) : null; return (!f || d >= f) && (!to || d <= to); }).length} tickets
                </strong> and <strong style={{ color: 'var(--primary)' }}>{customers.length} clients</strong>.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <motion.button className="btn btn-primary" style={{ flex: 1, gap: '0.4rem' }} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleGeneratePDF}>
                  <FileText size={15} /> Generate PDF
                </motion.button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit User Modal */}
        {modal === 'editUser' && targetItem && (
          <Modal title={`Edit Account — ${targetItem.name}`} onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Full Name</label>
                  <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Email</label>
                  <input className="input" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select className="input" style={{ fontFamily: 'var(--font-display)' }} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="receptionist">Receptionist</option>
                    <option value="technician">Technician</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div>
                  <label className="label">New Password <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(leave blank to keep)</span></label>
                  <input className="input" type="password" placeholder="••••••••" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <motion.button className="btn btn-primary" style={{ flex: 1, gap: '0.4rem' }} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleSaveUser}>
                  {editSaving
                    ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Saving…</motion.span>
                    : <><Save size={15} /> Save Changes</>
                  }
                </motion.button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Delete User Modal */}
        {modal === 'deleteUser' && targetItem && (
          <Modal title="Delete Account" onClose={() => setModal(null)} maxWidth={420}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,94,138,0.12)', border: '1px solid rgba(255,94,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={26} color="var(--warning)" />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Delete <strong style={{ color: 'var(--primary)' }}>{targetItem.name}</strong>?</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.6 }}>This action is permanent. The account will be removed from the system.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <motion.button className="btn btn-ghost" style={{ flex: 1, background: 'rgba(255,94,138,0.1)', border: '1px solid rgba(255,94,138,0.3)', color: 'var(--warning)' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleDeleteUser}>
                  <Trash2 size={14} /> Yes, Delete
                </motion.button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Confirm Delete Ticket Modal */}
        {modal === 'deleteTicket' && targetItem && (
          <Modal title="Delete Ticket" onClose={() => setModal(null)} maxWidth={420}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,94,138,0.12)', border: '1px solid rgba(255,94,138,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={26} color="var(--warning)" />
              </div>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>Delete ticket <strong style={{ color: 'var(--primary)' }}>{targetItem.ticketCode ?? targetItem.id}</strong>?</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Client: <strong>{targetItem.customerName}</strong> · {targetItem.device}<br />
                  This action is permanent and cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <motion.button className="btn btn-ghost" style={{ flex: 1, background: 'rgba(255,94,138,0.1)', border: '1px solid rgba(255,94,138,0.3)', color: 'var(--warning)' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={handleDeleteTicket}>
                  <Trash2 size={14} /> Yes, Delete
                </motion.button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
};

export default AdminDashboard;