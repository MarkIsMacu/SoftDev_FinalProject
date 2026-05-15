/**
 * RepairTickets — visible to ALL roles, but with role-gated actions.
 *
 * Data flow:
 *   - Reads from DataContext.tickets (shared, global)
 *   - Admin / Receptionist can create tickets → immediately in TechnicianWorkspace queue
 *   - Admin / Receptionist can update ticket status
 *   - Technician can update ticket status from here too
 *   - Customer sees ONLY their own tickets (filtered by customerId = CUST-005 for demo)
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, RefreshCw, MoreHorizontal,
  X, Wrench, User, Calendar, AlertCircle, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData, TECHNICIANS } from '../context/DataContext.jsx';

const STATUS_CFG = {
  'Completed':      { cls: 'badge-completed', label: 'Completed' },
  'In Progress':    { cls: 'badge-progress',  label: 'In Progress' },
  'Awaiting Parts': { cls: 'badge-waiting',   label: 'Awaiting Parts' },
  'Received':       { cls: 'badge-neutral',   label: 'Received' },
};

const FILTERS = ['All', 'Received', 'In Progress', 'Awaiting Parts', 'Completed'];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rowAnim = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

// ── Shared Modal ──────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose, maxWidth = 540 }) => (
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
      style={{ width: '100%', maxWidth, padding: '2rem', maxHeight: '88vh', overflowY: 'auto' }}
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

// ── Row context menu ──────────────────────────────────────────────────────────
const TicketMenu = ({ ticket, role, onClose, onViewDetail, onUpdateStatus }) => {
  const canEdit = ['admin', 'receptionist', 'technician'].includes(role);
  const items = [
    { label: 'View Details', action: onViewDetail, always: true },
    ...(canEdit ? [
      { label: 'Mark Received',    action: () => onUpdateStatus('Received') },
      { label: 'Mark In Progress', action: () => onUpdateStatus('In Progress') },
      { label: 'Mark Awaiting Parts', action: () => onUpdateStatus('Awaiting Parts') },
      { label: 'Mark Completed',   action: () => onUpdateStatus('Completed') },
    ] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.13 }}
      style={{
        position: 'absolute', right: 0, top: '110%', zIndex: 200,
        background: 'var(--bg-surface-2)', border: '1px solid var(--border-2)',
        borderRadius: 12, padding: '0.4rem', minWidth: 195,
        backdropFilter: 'blur(24px)', boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
      }}
    >
      {items.map(({ label, action }) => (
        <button key={label} className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'flex-start', padding: '0.55rem 0.75rem', fontSize: '0.82rem', borderRadius: 8 }}
          onClick={() => { action(); onClose(); }}>
          {label}
        </button>
      ))}
    </motion.div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const RepairTickets = () => {
  const { user } = useAuth();
  const role     = user?.role;
  const { tickets, customers, createTicket, updateTicketStatus } = useData();

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [modal, setModal]       = useState(null); // null | 'new' | { type:'detail', ticket }
  const [openMenu, setOpenMenu] = useState(null);
  const [newForm, setNewForm]   = useState({ customerName: '', customerId: '', device: '', issue: '', clientNote: '', assignedTo: 'TECH-001', status: 'Received' });
  const [formErr, setFormErr]   = useState('');
  const [saved, setSaved]       = useState(false);

  // Customers filter customers dropdown
  const customerOptions = customers.map(c => ({ id: c.id, name: c.name }));

  // ── Role-based ticket visibility ───────────────────────────────────────────
  const roleTickets = useMemo(() => {
    if (role === 'customer') {
      // Filter by the logged-in customer's ID (comes from accounts.js via AuthContext)
      return tickets.filter(t => t.customerId === user.customerId);
    }
    return tickets;
  }, [tickets, role, user]);

  const visible = useMemo(() =>
    roleTickets.filter(t => {
      const matchFilter = filter === 'All' || t.status === filter;
      const matchSearch = !search ||
        [t.id, t.customerName, t.device, t.issue].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return matchFilter && matchSearch;
    }),
    [roleTickets, filter, search]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusUpdate = (ticketId, newStatus) => {
    updateTicketStatus(ticketId, newStatus, user.name);
    // If the detail modal is open for this ticket, sync its status
    setModal(prev =>
      prev?.type === 'detail' && prev.ticket.id === ticketId
        ? { ...prev, ticket: { ...prev.ticket, status: newStatus } }
        : prev
    );
  };

  const handleCreateTicket = () => {
    if (!newForm.customerName || !newForm.device || !newForm.issue) {
      setFormErr('Client name, device, and issue are required.'); return;
    }
    createTicket({ ...newForm }, user.name);
    setSaved(true);
    setTimeout(() => {
      setSaved(false); setModal(null);
      setNewForm({ customerName: '', customerId: '', device: '', issue: '', clientNote: '', assignedTo: 'TECH-001', status: 'Received' });
      setFormErr('');
    }, 900);
  };

  const canCreate = ['admin', 'receptionist'].includes(role);
  const canEdit   = ['admin', 'receptionist', 'technician'].includes(role);

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={rowAnim} className="page-header">
          <div>
            <h1 className="page-title gradient-text">Diagnostic Queue</h1>
            <p className="page-subtitle">
              {role === 'customer'
                ? 'Track the status of your repair requests'
                : 'All active and archived repair cycles'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.button className="btn btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <RefreshCw size={16} />
            </motion.button>
            {canCreate && (
              <motion.button id="btn-new-ticket" className="btn btn-primary"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setModal('new'); setFormErr(''); setSaved(false); }}
                style={{ gap: '0.4rem' }}>
                <Plus size={18} /> New Ticket
              </motion.button>
            )}
          </div>
        </motion.div>

        <motion.div variants={rowAnim} className="card" style={{ padding: '1.75rem' }}>
          {/* Search + Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div className="search-bar-wrap" style={{ flex: 1, minWidth: 220 }}>
              <Search size={16} className="search-icon" />
              <input className="input" placeholder="Search by ID, client, device, or issue…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <motion.button key={f} whileTap={{ scale: 0.95 }}
                  onClick={() => setFilter(f)}
                  className={filter === f ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ fontSize: '0.8rem', padding: '0.55rem 1rem' }}>
                  {f}
                  {f !== 'All' && (
                    <span style={{
                      marginLeft: '0.3rem', fontSize: '0.7rem',
                      background: filter === f ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '0.05rem 0.4rem',
                    }}>
                      {roleTickets.filter(t => t.status === f).length}
                    </span>
                  )}
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
                  <th>Device</th>
                  <th>Issue</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <motion.tbody variants={container} initial="hidden" animate="show">
                {visible.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>
                    No tickets match your query.
                  </td></tr>
                ) : (
                  visible.map(ticket => {
                    const tech = TECHNICIANS.find(t => t.id === ticket.assignedTo);
                    return (
                      <motion.tr key={ticket.id} variants={rowAnim}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setModal({ type: 'detail', ticket })}>
                        <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>{ticket.id}</td>
                        <td style={{ fontWeight: 600 }}>{ticket.customerName}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{ticket.device}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: '0.88rem', maxWidth: 200 }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ticket.issue}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{tech?.name ?? '—'}</td>
                        <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>{ticket.date}</td>
                        <td>
                          <span className={`badge ${STATUS_CFG[ticket.status]?.cls ?? 'badge-neutral'}`}>
                            {STATUS_CFG[ticket.status]?.label ?? ticket.status}
                          </span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          <motion.button className="btn btn-ghost"
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            style={{ padding: '0.35rem', borderRadius: 8, minWidth: 0 }}
                            onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === ticket.id ? null : ticket.id); }}>
                            <MoreHorizontal size={16} />
                          </motion.button>
                          <AnimatePresence>
                            {openMenu === ticket.id && (
                              <TicketMenu
                                ticket={ticket} role={role}
                                onClose={() => setOpenMenu(null)}
                                onViewDetail={() => setModal({ type: 'detail', ticket })}
                                onUpdateStatus={s => handleStatusUpdate(ticket.id, s)}
                              />
                            )}
                          </AnimatePresence>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>

          {/* Record count */}
          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'right' }}>
            Showing {visible.length} of {roleTickets.length} {role === 'customer' ? 'your' : 'total'} tickets
          </div>
        </motion.div>
      </motion.div>

      {/* Close menu on outside click */}
      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpenMenu(null)} />
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {/* Create Ticket */}
        {modal === 'new' && (
          <Modal title="Create New Repair Ticket" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Client Name *</label>
                  <input className="input" placeholder="e.g. Juan dela Cruz"
                    value={newForm.customerName}
                    onChange={e => {
                      setNewForm(f => ({ ...f, customerName: e.target.value }));
                      setFormErr('');
                      // try to auto-match customer
                      const match = customers.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                      if (match) setNewForm(f => ({ ...f, customerName: e.target.value, customerId: match.id }));
                    }} />
                  {/* Customer quick-match */}
                  {newForm.customerName.length > 1 && customers.filter(c =>
                    c.name.toLowerCase().includes(newForm.customerName.toLowerCase())
                  ).length > 0 && (
                    <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {customers.filter(c =>
                        c.name.toLowerCase().includes(newForm.customerName.toLowerCase())
                      ).map(c => (
                        <button key={c.id}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 6, gap: '0.3rem' }}
                          onClick={() => setNewForm(f => ({ ...f, customerName: c.name, customerId: c.id }))}>
                          <User size={11} /> {c.name} <span style={{ color: 'var(--text-3)', fontSize: '0.68rem' }}>({c.id})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Device / Hardware *</label>
                  <input className="input" placeholder="e.g. Dell XPS 15 9520"
                    value={newForm.device}
                    onChange={e => { setNewForm(f => ({ ...f, device: e.target.value })); setFormErr(''); }} />
                </div>
                <div>
                  <label className="label">Assigned Technician</label>
                  <select className="input" value={newForm.assignedTo}
                    onChange={e => setNewForm(f => ({ ...f, assignedTo: e.target.value }))}
                    style={{ fontFamily: 'var(--font-display)' }}>
                    {TECHNICIANS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Fault Description *</label>
                  <input className="input" placeholder="e.g. Screen not turning on after drop"
                    value={newForm.issue}
                    onChange={e => { setNewForm(f => ({ ...f, issue: e.target.value })); setFormErr(''); }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Client's Note <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
                  <textarea className="input" rows={2} placeholder="What the client said about the problem…"
                    value={newForm.clientNote}
                    onChange={e => setNewForm(f => ({ ...f, clientNote: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label className="label">Initial Status</label>
                  <select className="input" value={newForm.status}
                    onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}
                    style={{ fontFamily: 'var(--font-display)' }}>
                    <option>Received</option>
                    <option>In Progress</option>
                    <option>Awaiting Parts</option>
                  </select>
                </div>
              </div>

              {formErr && (
                <p style={{ fontSize: '0.82rem', color: 'var(--warning)', padding: '0.5rem 0.75rem', background: 'rgba(255,94,138,0.08)', borderRadius: 8, border: '1px solid rgba(255,94,138,0.2)' }}>
                  {formErr}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <motion.button className="btn btn-primary" style={{ flex: 1, gap: '0.4rem' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCreateTicket}>
                  {saved
                    ? <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: 2, duration: 0.4 }}>✓ Ticket Created & Sent to Tech Queue!</motion.span>
                    : <><ClipboardList size={15} /> Create Ticket</>
                  }
                </motion.button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', textAlign: 'center' }}>
                Ticket will immediately appear in the assigned technician's queue.
              </p>
            </div>
          </Modal>
        )}

        {/* Ticket Detail */}
        {modal?.type === 'detail' && (() => {
          const t = modal.ticket;
          // Always get the latest version of this ticket from the store
          const live = tickets.find(x => x.id === t.id) ?? t;
          return (
            <Modal title="Ticket Detail" onClose={() => setModal(null)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700 }}>{live.id}</span>
                  <span className={`badge ${STATUS_CFG[live.status]?.cls ?? 'badge-neutral'}`}>
                    {STATUS_CFG[live.status]?.label ?? live.status}
                  </span>
                </div>
                <div className="divider" />

                {/* Info rows */}
                {[
                  { icon: <User size={14} />,        label: 'Client',      value: live.customerName },
                  { icon: <Wrench size={14} />,      label: 'Device',      value: live.device },
                  { icon: <AlertCircle size={14} />, label: 'Issue',       value: live.issue },
                  { icon: <Calendar size={14} />,    label: 'Date Opened', value: live.date },
                  { icon: <User size={14} />,        label: 'Assigned To', value: TECHNICIANS.find(x => x.id === live.assignedTo)?.name ?? '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.15rem' }}>{label}</div>
                      <div style={{ fontSize: '0.9rem' }}>{value}</div>
                    </div>
                  </div>
                ))}

                {/* Client note */}
                {live.clientNote && (
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--warning-dim)', border: '1px solid rgba(255,94,138,0.2)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Client Note</p>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{live.clientNote}</p>
                  </div>
                )}

                {/* Findings (from tech) */}
                {live.findings && (
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Technician Findings</p>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>{live.findings}</p>
                  </div>
                )}

                {/* Parts */}
                {live.parts?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Parts Required</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {live.parts.map(p => (
                        <span key={p} className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem', textTransform: 'none', letterSpacing: 0 }}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status update (admin/receptionist/technician) */}
                {canEdit && (
                  <>
                    <div className="divider" />
                    <div>
                      <label className="label">Update Status</label>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['Received', 'In Progress', 'Awaiting Parts', 'Completed'].map(s => (
                          <motion.button key={s} whileTap={{ scale: 0.95 }}
                            className={live.status === s ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                            onClick={() => handleStatusUpdate(live.id, s)}>
                            {s}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Activity Log */}
                {live.activityLog?.length > 0 && (
                  <>
                    <div className="divider" />
                    <div>
                      <label className="label">Activity Log</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 160, overflowY: 'auto' }}>
                        {live.activityLog.map((e, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-2)' }}>{e.action} <span style={{ color: 'var(--text-3)' }}>by {e.by}</span></span>
                            <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>{e.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button className="btn btn-ghost" onClick={() => setModal(null)} style={{ width: '100%', marginTop: '0.25rem' }}>Close</button>
              </div>
            </Modal>
          );
        })()}
      </AnimatePresence>
    </>
  );
};

export default RepairTickets;
