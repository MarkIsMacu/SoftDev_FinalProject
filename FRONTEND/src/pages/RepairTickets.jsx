import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, MoreHorizontal, RefreshCw } from 'lucide-react';
import { ticketsAPI } from '../services/api.js';
import useAsync from '../hooks/useAsync.js';
import { SkeletonRow } from '../components/SkeletonLoader.jsx';
import ApiError from '../components/ApiError.jsx';
import { useAuth } from '../context/AuthContext.jsx';

/** ── Static shape — remove when backend delivers real data ── */
const MOCK_TICKETS = [
  { id: 'RT-1042', customerId: 'CUST-001', customerName: 'John Doe',      device: 'MacBook Pro 16" M1',  issue: 'Battery degradation',     status: 'Completed',      date: '2026-05-10' },
  { id: 'RT-1043', customerId: 'CUST-002', customerName: 'Alice Smith',    device: 'Dell XPS 13 9310',    issue: 'Display artifacting',     status: 'In Progress',    date: '2026-05-11' },
  { id: 'RT-1044', customerId: 'CUST-003', customerName: 'Bob Johnson',    device: 'Lenovo ThinkPad X1', issue: 'Keyboard matrix failure', status: 'Awaiting Parts', date: '2026-05-11' },
  { id: 'RT-1045', customerId: 'CUST-004', customerName: 'Charlie Brown',  device: 'Custom ATX Build',    issue: 'Thermal throttling',      status: 'Received',       date: '2026-05-12' },
  { id: 'RT-1046', customerId: 'CUST-005', customerName: 'Diana Prince',   device: 'HP Spectre x360',     issue: 'Power delivery fault',    status: 'In Progress',    date: '2026-05-12' },
];

const STATUS_CFG = {
  'Completed':      { cls: 'badge-completed', label: 'Completed' },
  'In Progress':    { cls: 'badge-progress',  label: 'In Progress' },
  'Awaiting Parts': { cls: 'badge-waiting',   label: 'Awaiting' },
  'Received':       { cls: 'badge-neutral',   label: 'Received' },
};

const FILTERS = ['All', 'In Progress', 'Awaiting Parts', 'Completed', 'Received'];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const row = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0,  transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const RepairTickets = () => {
  const { user } = useAuth();
  const role = user?.role;

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');

  // ── Backend integration point ────────────────────────────────────────────
  // const { data, loading, error, execute } = useAsync(() =>
  //   ticketsAPI.getAll({ status: filter !== 'All' ? filter : undefined, q: search })
  // );
  // const tickets = data?.tickets ?? [];
  //
  const tickets = MOCK_TICKETS;
  const loading = false;
  const error   = null;
  const execute = () => {};
  // ─────────────────────────────────────────────────────────────────────────

  const visible = useMemo(() =>
    tickets.filter(t => {
      const matchFilter = filter === 'All' || t.status === filter;
      const matchSearch = !search || [t.id, t.customerName, t.device].some(v => v.toLowerCase().includes(search.toLowerCase()));
      return matchFilter && matchSearch;
    }),
    [tickets, filter, search]
  );

  if (error) return <ApiError message={error} onRetry={execute} />;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={row} className="page-header">
        <div>
          <h1 className="page-title gradient-text">Diagnostic Queue</h1>
          <p className="page-subtitle">All active and archived repair cycles</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={execute}><RefreshCw size={16} /></button>
          {['admin', 'receptionist'].includes(role) && (
            <button className="btn btn-primary"><Plus size={18} /> New Ticket</button>
          )}
        </div>
      </motion.div>

      <motion.div variants={row} className="card" style={{ padding: '1.75rem' }}>
        {/* Search + Filter Bar */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="search-bar-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="input"
              placeholder="Search by ID, client, or device…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <motion.button
                key={f}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(f)}
                className={filter === f ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ fontSize: '0.8rem', padding: '0.55rem 1rem' }}
              >
                {f}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Client</th>
                <th>Hardware</th>
                <th>Fault Description</th>
                <th>Opened</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {loading ? (
                [1,2,3,4].map(i => <SkeletonRow key={i} />)
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>
                    No tickets match your query.
                  </td>
                </tr>
              ) : (
                visible.map(ticket => (
                  <motion.tr key={ticket.id} variants={row} style={{ cursor: 'pointer' }}>
                    <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>{ticket.id}</td>
                    <td style={{ fontWeight: 600 }}>{ticket.customerName}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{ticket.device}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{ticket.issue}</td>
                    <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{ticket.date}</td>
                    <td>
                      <span className={`badge ${STATUS_CFG[ticket.status]?.cls ?? 'badge-neutral'}`}>
                        {STATUS_CFG[ticket.status]?.label ?? ticket.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '0.35rem', borderRadius: 8, minWidth: 0 }}>
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default RepairTickets;
