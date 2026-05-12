import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Phone, Mail, ChevronRight, RefreshCw } from 'lucide-react';
import { customersAPI } from '../services/api.js';
import useAsync from '../hooks/useAsync.js';
import { SkeletonRow } from '../components/SkeletonLoader.jsx';
import ApiError from '../components/ApiError.jsx';

/** ── Mock data shape — matches exact backend response contract ── */
const MOCK_CUSTOMERS = [
  { id: 'CUST-001', name: 'John Doe',      phone: '+63 912 345 6789', email: 'john.doe@email.com',   activeRepairs: 1, totalRepairs: 3 },
  { id: 'CUST-002', name: 'Alice Smith',   phone: '+63 998 765 4321', email: 'alice.s@email.com',    activeRepairs: 1, totalRepairs: 1 },
  { id: 'CUST-003', name: 'Bob Johnson',   phone: '+63 917 111 2222', email: 'b.johnson@email.com',  activeRepairs: 1, totalRepairs: 5 },
  { id: 'CUST-004', name: 'Charlie Brown', phone: '+63 922 333 4444', email: 'charlie.b@email.com',  activeRepairs: 0, totalRepairs: 2 },
  { id: 'CUST-005', name: 'Diana Prince',  phone: '+63 933 444 5555', email: 'diana.p@email.com',    activeRepairs: 1, totalRepairs: 1 },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const row = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } } };

const CustomerManagement = () => {
  const [search, setSearch] = useState('');

  // ── Backend integration point ────────────────────────────────────────────
  // const { data, loading, error, execute } = useAsync(() => customersAPI.getAll({ q: search }));
  // const customers = data?.customers ?? [];
  //
  const customers = MOCK_CUSTOMERS;
  const loading   = false;
  const error     = null;
  const execute   = () => {};
  // ─────────────────────────────────────────────────────────────────────────

  const visible = useMemo(() =>
    customers.filter(c =>
      !search || [c.name, c.phone, c.email, c.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
    ),
    [customers, search]
  );

  // Avatar initials helper
  const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (error) return <ApiError message={error} onRetry={execute} />;

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={row} className="page-header">
        <div>
          <h1 className="page-title gradient-text">Client Registry</h1>
          <p className="page-subtitle">Global directory of customer profiles and service history</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={execute}><RefreshCw size={16} /></button>
          <button className="btn btn-primary"><UserPlus size={18} /> Register Client</button>
        </div>
      </motion.div>

      <motion.div variants={row} className="card" style={{ padding: '1.75rem' }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="search-bar-wrap">
            <Search size={16} className="search-icon" />
            <input
              className="input"
              placeholder="Search by name, phone, email, or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Active Tickets</th>
                <th>Total Sessions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <motion.tbody variants={container} initial="hidden" animate="show">
              {loading ? (
                [1,2,3,4].map(i => <SkeletonRow key={i} />)
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No clients found.</td>
                </tr>
              ) : (
                visible.map(c => (
                  <motion.tr key={c.id} variants={row} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        {/* Avatar */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--accent), var(--primary-deep))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                        }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</div>
                          <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                        <Phone size={13} color="var(--text-3)" /> {c.phone}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        <Mail size={13} color="var(--text-3)" /> {c.email}
                      </div>
                    </td>
                    <td>
                      {c.activeRepairs > 0 ? (
                        <span className="badge badge-progress">{c.activeRepairs} Active</span>
                      ) : (
                        <span className="badge badge-neutral">None</span>
                      )}
                    </td>
                    <td>
                      <span className="display" style={{ fontSize: '1.4rem', fontWeight: 700, color: c.totalRepairs >= 4 ? 'var(--primary)' : 'var(--text-1)' }}>
                        {c.totalRepairs}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Profile</button>
                        <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.3rem' }}>
                          History <ChevronRight size={14} />
                        </button>
                      </div>
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

export default CustomerManagement;
