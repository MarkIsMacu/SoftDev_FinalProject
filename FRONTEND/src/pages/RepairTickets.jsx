import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, RefreshCw, MoreHorizontal,
  X, Wrench, User, Calendar, AlertCircle, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';

const STATUS_CFG = {
  'Completed': { cls: 'badge-completed', label: 'Completed' },
  'In Progress': { cls: 'badge-progress', label: 'In Progress' },
  'Awaiting Parts': { cls: 'badge-waiting', label: 'Awaiting Parts' },
  'Received': { cls: 'badge-neutral', label: 'Received' },
};

const FILTERS = ['All', 'Received', 'In Progress', 'Awaiting Parts', 'Completed'];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rowAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

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

const TicketMenu = ({ ticket, role, onClose, onViewDetail, onUpdateStatus }) => {
  const canEdit = ['admin', 'receptionist', 'technician'].includes(role);
  const items = [
    { label: 'View Details', action: onViewDetail, always: true },
    ...(canEdit ? [
      { label: 'Mark Received', action: () => onUpdateStatus('Received') },
      { label: 'Mark In Progress', action: () => onUpdateStatus('In Progress') },
      { label: 'Mark Awaiting Parts', action: () => onUpdateStatus('Awaiting Parts') },
      { label: 'Mark Completed', action: () => onUpdateStatus('Completed') },
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

const RepairTickets = () => {
  const { user } = useAuth();
  const role = user?.role;
  const { tickets, customers, technicians, createTicket, updateTicketStatus, refreshTickets } = useData();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [newForm, setNewForm] = useState({
    customerName: '', customerId: '', device: '', issue: '',
    clientNote: '', assignedTo: '', status: 'Received',
  });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaultTechId = technicians[0]?.id ?? '';

  const roleTickets = useMemo(() => {
    if (role === 'customer') {
      return tickets.filter(t => t.customerId === user.customerId);
    }
    return tickets;
  }, [tickets, role, user]);

  const visible = useMemo(() =>
    roleTickets.filter(t => {
      const matchFilter = filter === 'All' || t.status === filter;
      const matchSearch = !search ||
        [t.ticketCode, t.id, t.customerName, t.device, t.issue]
          .some(v => v?.toLowerCase().includes(search.toLowerCase()));
      return matchFilter && matchSearch;
    }),
    [roleTickets, filter, search]
  );

  const handleStatusUpdate = async (ticketId, newStatus) => {
    await updateTicketStatus(ticketId, newStatus);
    setModal(prev =>
      prev?.type === 'detail' && prev.ticket.id === ticketId
        ? { ...prev, ticket: { ...prev.ticket, status: newStatus } }
        : prev
    );
  };

  const handleCreateTicket = async () => {
    if (!newForm.customerName || !newForm.device || !newForm.issue) {
      setFormErr('Client name, device, and issue are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      await createTicket({
        ...newForm,
        customerId: newForm.customerId || undefined,
        assignedTo: newForm.assignedTo || defaultTechId || undefined,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setModal(null);
        setNewForm({ customerName: '', customerId: '', device: '', issue: '', clientNote: '', assignedTo: '', status: 'Received' });
        setFormErr('');
      }, 900);
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canCreate = ['admin', 'receptionist'].includes(role);
  const canEdit = ['admin', 'receptionist', 'technician'].includes(role);

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
            <motion.button className="btn btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={refreshTickets}>
              <RefreshCw size={16} />
            </motion.button>
            {canCreate && (
              <motion.button id="btn-new-ticket" className="btn btn-primary"
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setModal('new');
                  setFormErr('');
                  setSaved(false);
                  setNewForm(f => ({ ...f, assignedTo: defaultTechId }));
                }}
                style={{ gap: '0.4rem' }}>
                <Plus size={18} /> New Ticket
              </motion.button>
            )}
          </div>
        </motion.div>

        <motion.div variants={rowAnim} className="card" style={{ padding: '1.75rem' }}>
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

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
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
                  visible.map(ticket => (
                    <motion.tr key={ticket.id} variants={rowAnim}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setModal({ type: 'detail', ticket })}>
                      <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {ticket.ticketCode ?? ticket.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>{ticket.customerName}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>{ticket.device}</td>
                      <td style={{ color: 'var(--text-2)', fontSize: '0.88rem', maxWidth: 200 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {ticket.issue}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
                        {ticket.techName ?? '—'}
                      </td>
                      <td className="mono" style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                        {typeof ticket.date === 'string'
                          ? ticket.date.split('T')[0]
                          : new Date(ticket.date).toISOString().split('T')[0]}
                      </td>
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
                  ))
                )}
              </motion.tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'right' }}>
            Showing {visible.length} of {roleTickets.length} {role === 'customer' ? 'your' : 'total'} tickets
          </div>
        </motion.div>
      </motion.div>

      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpenMenu(null)} />
      )}

      <AnimatePresence>
        {modal === 'new' && (
          <Modal title="Create New Repair Ticket" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Client Name *</label>
                  <input className="input" placeholder="e.g. Juan dela Cruz"
                    value={newForm.customerName}
                    onChange={e => {
                      setNewForm(f => ({ ...f, customerName: e.target.value, customerId: '' }));
                      setFormErr('');
                    }} />
                  {newForm.customerName.length > 1 && (() => {
                    const matches = customers.filter(c =>
                      c.name.toLowerCase().includes(newForm.customerName.toLowerCase())
                    );
                    return matches.length > 0 ? (
                      <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {matches.map(c => (
                          <button key={c.id}
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 6, gap: '0.3rem' }}
                            onClick={() => setNewForm(f => ({ ...f, customerName: c.name, customerId: c.id }))}>
                            <User size={11} /> {c.name}
                            <span style={{ color: 'var(--text-3)', fontSize: '0.68rem' }}>({c.id.slice(-6)})</span>
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="label">Device / Hardware *</label>
                  <input className="input" placeholder="e.g. Dell XPS 15 9520"
                    value={newForm.device}
                    onChange={e => { setNewForm(f => ({ ...f, device: e.target.value })); setFormErr(''); }} />
                </div>

                <div>
                  <label className="label">Assigned Technician</label>
                  <select className="input" value={newForm.assignedTo || defaultTechId}
                    onChange={e => setNewForm(f => ({ ...f, assignedTo: e.target.value }))}
                    style={{ fontFamily: 'var(--font-display)' }}>
                    <option value="">— Unassigned —</option>
                    {/* FIX: real technicians from DB */}
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
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
                    <option value="Received">Received</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Awaiting Parts">Awaiting Parts</option>
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
                  disabled={saving}
                  onClick={handleCreateTicket}>
                  {saved
                    ? <motion.span animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: 2, duration: 0.4 }}>✓ Ticket Created!</motion.span>
                    : saving
                      ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Creating…</motion.span>
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

        {modal?.type === 'detail' && (() => {
          const t = modal.ticket;
          const live = tickets.find(x => x.id === t.id) ?? t;
          const tech = technicians.find(x => x.id === live.assignedTo);
          return (
            <Modal title="Ticket Detail" onClose={() => setModal(null)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {live.ticketCode ?? live.id}
                  </span>
                  <span className={`badge ${STATUS_CFG[live.status]?.cls ?? 'badge-neutral'}`}>
                    {STATUS_CFG[live.status]?.label ?? live.status}
                  </span>
                </div>
                <div className="divider" />

                {[
                  { icon: <User size={14} />, label: 'Client', value: live.customerName },
                  { icon: <Wrench size={14} />, label: 'Device', value: live.device },
                  { icon: <AlertCircle size={14} />, label: 'Issue', value: live.issue },
                  { icon: <Calendar size={14} />, label: 'Date Opened', value: typeof live.date === 'string' ? live.date.split('T')[0] : new Date(live.date).toISOString().split('T')[0] },
                  { icon: <User size={14} />, label: 'Assigned To', value: tech?.name ?? live.techName ?? '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.15rem' }}>{label}</div>
                      <div style={{ fontSize: '0.9rem' }}>{value}</div>
                    </div>
                  </div>
                ))}

                {live.clientNote && (
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--warning-dim)', border: '1px solid rgba(255,94,138,0.2)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Client Note</p>
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{live.clientNote}</p>
                  </div>
                )}

                {live.findings && (
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Technician Findings</p>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>{live.findings}</p>
                  </div>
                )}

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