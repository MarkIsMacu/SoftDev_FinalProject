import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, RefreshCw, MoreHorizontal,
  X, Wrench, User, Calendar, AlertCircle, ClipboardList, ChevronDown, Check,
  MessageCircle, Send, Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { ticketsAPI } from '../services/api.js';

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

const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ── MessageBubble ───────────────────────────────────────────────────────
const MessageBubble = ({ msg, isMine }) => (
  <div style={{
    display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
    alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.85rem',
  }}>
    {/* Avatar */}
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: isMine
        ? 'linear-gradient(135deg, var(--primary), var(--primary-deep))'
        : 'linear-gradient(135deg, var(--accent), #6236FF)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6rem', fontWeight: 700, color: isMine ? '#000' : '#fff',
      fontFamily: 'var(--font-display)',
    }}>
      {msg.sender.name.charAt(0).toUpperCase()}
    </div>
    {/* Bubble */}
    <div style={{ maxWidth: '72%' }}>
      <div style={{
        fontSize: '0.7rem', color: 'var(--text-3)',
        marginBottom: '0.2rem', textAlign: isMine ? 'right' : 'left',
        fontFamily: 'var(--font-display)',
      }}>
        {isMine ? 'You' : msg.sender.name}
        <span style={{ margin: '0 0.3rem', opacity: 0.5 }}>·</span>
        {fmtTime(msg.createdAt)}
      </div>
      <div style={{
        background: isMine
          ? 'linear-gradient(135deg, var(--primary-deep), rgba(0,229,255,0.2))'
          : 'rgba(255,255,255,0.06)',
        border: isMine
          ? '1px solid rgba(0,229,255,0.25)'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.88rem',
        lineHeight: 1.55,
        color: 'var(--text-1)',
        wordBreak: 'break-word',
      }}>
        {msg.body}
      </div>
    </div>
  </div>
);

// ── TicketMessages ─────────────────────────────────────────────────
const TicketMessages = ({ ticketId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await ticketsAPI.getMessages(ticketId);
      setMessages(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  // auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await ticketsAPI.sendMessage(ticketId, body);
      setMessages(prev => [...prev, msg]);
      setDraft('');
    } catch (err) {
      console.error('Send failed:', err);
    } finally { setSending(false); }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 340 }}>
      {/* Messages scrollable area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1rem',
        background: 'rgba(0,0,0,0.2)', borderRadius: 10,
        border: '1px solid var(--border-1)',
        marginBottom: '0.75rem',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem', fontSize: '0.85rem' }}>
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <MessageCircle size={28} style={{ color: 'var(--text-3)', margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-3)', fontSize: '0.83rem' }}>No messages yet.</p>
            <p style={{ color: 'var(--text-3)', fontSize: '0.76rem', marginTop: '0.25rem' }}>Start the conversation about this ticket.</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender.id === currentUser?.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <textarea
          className="input"
          rows={2}
          placeholder="Type a message… (Enter to send)"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          style={{ flex: 1, resize: 'none', fontSize: '0.88rem', lineHeight: 1.5 }}
        />
        <motion.button
          className="btn btn-primary"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          disabled={!draft.trim() || sending}
          onClick={handleSend}
          style={{ padding: '0.6rem 0.9rem', minWidth: 0, borderRadius: 10 }}
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  );
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

// ── Searchable Customer Dropdown ─────────────────────────────────────────────
const CustomerDropdown = ({ customers, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = customers.find(c => c.id === value) ?? null;

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [customers, search]);

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    } else {
      const t = setTimeout(() => setSearch(''), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        className="input"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer',
          textAlign: 'left', gap: '0.5rem',
          color: selected ? 'var(--text-1)' : 'var(--text-3)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <User size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.name}
              </span>
              {selected.phone && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>
                  {selected.phone}
                </span>
              )}
            </>
          ) : (
            <span>Select a registered client…</span>
          )}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        </motion.span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              zIndex: 9999,
              background: 'var(--bg-surface-2)',
              border: '1px solid var(--border-2)',
              borderRadius: 12,
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Search box inside dropdown */}
            <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-1)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-3)', pointerEvents: 'none',
                }} />
                <input
                  ref={inputRef}
                  className="input"
                  placeholder="Search by name, email or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '2rem', fontSize: '0.83rem', height: 34 }}
                />
              </div>
            </div>

            {/* Customer list */}
            <div style={{ maxHeight: 220, overflowY: 'auto', padding: '0.35rem' }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '1.5rem', textAlign: 'center',
                  color: 'var(--text-3)', fontSize: '0.83rem',
                }}>
                  {customers.length === 0
                    ? 'No customers registered yet. Register one first!'
                    : 'No customers match your search.'}
                </div>
              ) : (
                filtered.map(c => (
                  <motion.button
                    key={c.id}
                    type="button"
                    whileHover={{ background: 'rgba(0,229,255,0.07)' }}
                    onClick={() => { onChange(c); setOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: '0.65rem', padding: '0.6rem 0.75rem',
                      borderRadius: 8, background: 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      color: 'var(--text-1)',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: c.id === value
                        ? 'linear-gradient(135deg, var(--primary), var(--primary-deep))'
                        : 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {c.id === value
                        ? <Check size={13} style={{ color: '#000' }} />
                        : <User size={13} style={{ color: 'var(--text-3)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 1 }}>
                        {c.email}{c.phone ? ` · ${c.phone}` : ''}
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: '0.5rem 0.75rem',
              borderTop: '1px solid var(--border-1)',
              fontSize: '0.71rem', color: 'var(--text-3)',
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}>
              <User size={11} /> {customers.length} registered client{customers.length !== 1 ? 's' : ''} in system
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RepairTickets = () => {
  const { user } = useAuth();
  const role = user?.role;
  const { tickets, customers, technicians, createTicket, updateTicketStatus, refreshTickets } = useData();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [newForm, setNewForm] = useState({
    customerName: '', customerId: '', device: '', issue: '',
    clientNote: '', assignedTo: '', status: 'Received',
  });
  const [customerDropdownKey, setCustomerDropdownKey] = useState(0);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detailTab, setDetailTab] = useState('info');

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
    if (!newForm.customerId || !newForm.customerName) {
      setFormErr('Please select a registered client from the dropdown.');
      return;
    }
    if (!newForm.device || !newForm.issue) {
      setFormErr('Device and issue description are required.');
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
        setCustomerDropdownKey(k => k + 1);
        setFormErr('');
      }, 900);
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canCreate = ['admin', 'receptionist'].includes(role);
  const canChangeStatus = ['admin', 'technician'].includes(role);

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
                      <td>
                        <motion.button className="btn btn-ghost"
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          style={{ padding: '0.35rem', borderRadius: 8, minWidth: 0 }}
                          onClick={e => { e.stopPropagation(); setModal({ type: 'detail', ticket }); }}>
                          <MoreHorizontal size={16} />
                        </motion.button>
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

      <AnimatePresence>
        {modal === 'new' && (
          <Modal title="Create New Repair Ticket" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="label">Client Name *</label>
                  <CustomerDropdown
                    key={customerDropdownKey}
                    customers={customers}
                    value={newForm.customerId}
                    onChange={c => {
                      setNewForm(f => ({ ...f, customerId: c.id, customerName: c.name }));
                      setFormErr('');
                    }}
                  />
                  {newForm.customerId && (
                    <p style={{ fontSize: '0.73rem', color: 'var(--primary)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={11} /> Client locked in: <strong>{newForm.customerName}</strong>
                    </p>
                  )}
                  {customers.length === 0 && (
                    <p style={{ fontSize: '0.73rem', color: 'var(--warning)', marginTop: '0.35rem' }}>
                      ⚠ No customers registered yet — go to Customer Management to add one first.
                    </p>
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
            <Modal title="Ticket Detail" onClose={() => { setModal(null); setDetailTab('info'); }} maxWidth={580}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {live.ticketCode ?? live.id}
                  </span>
                  <span className={`badge ${STATUS_CFG[live.status]?.cls ?? 'badge-neutral'}`}>
                    {STATUS_CFG[live.status]?.label ?? live.status}
                  </span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-1)' }}>
                  {[
                    { key: 'info',     label: 'Details',  icon: <ClipboardList size={13} /> },
                    { key: 'messages', label: 'Messages', icon: <MessageCircle size={13} /> },
                    ...(canChangeStatus ? [{ key: 'status', label: 'Status', icon: <Wrench size={13} /> }] : []),
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.65rem 1rem', background: 'none', border: 'none',
                      borderBottom: detailTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                      color: detailTab === tab.key ? 'var(--primary)' : 'var(--text-3)',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
                      cursor: 'pointer', transition: 'color 0.15s', marginBottom: -1,
                    }}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── INFO TAB ── */}
                {detailTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[
                        { icon: <User size={14} />, label: 'Client', value: live.customerName, span: true },
                        { icon: <Wrench size={14} />, label: 'Device', value: live.device, span: true },
                        { icon: <AlertCircle size={14} />, label: 'Issue', value: live.issue, span: true },
                        { icon: <Calendar size={14} />, label: 'Date Submitted', value: typeof live.date === 'string' ? live.date.split('T')[0] : new Date(live.date).toISOString().split('T')[0] },
                        { icon: <Calendar size={14} />, label: live.status === 'Completed' ? 'Date Completed' : 'Est. Pickup', value: live.status === 'Completed' ? (live.updatedAt ? (typeof live.updatedAt === 'string' ? live.updatedAt.split('T')[0] : new Date(live.updatedAt).toISOString().split('T')[0]) : '—') : 'Pending' },
                        { icon: <User size={14} />, label: 'Assigned To', value: tech?.name ?? live.techName ?? '—', span: true },
                      ].map(({ icon, label, value, span }) => (
                        <div key={label} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', gridColumn: span ? '1 / -1' : undefined }}>
                          <div style={{ color: 'var(--text-3)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
                          <div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.12rem' }}>{label}</div>
                            <div style={{ fontSize: '0.88rem', fontWeight: label === 'Date Submitted' || label === 'Date Completed' || label === 'Est. Pickup' ? 600 : 400, color: label === 'Date Completed' ? 'var(--success)' : label === 'Est. Pickup' && live.status !== 'Completed' ? 'var(--text-3)' : 'var(--text-1)' }}>{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

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
                  </div>
                )}

                {/* ── MESSAGES TAB ── */}
                {detailTab === 'messages' && (
                  <TicketMessages ticketId={live.id} currentUser={user} />
                )}

                {/* ── STATUS TAB ── */}
                {detailTab === 'status' && canChangeStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      Update the repair status for ticket <strong style={{ color: 'var(--primary)' }}>{live.ticketCode}</strong>.
                      This will be logged in the activity trail and visible to the customer.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      {['Received', 'In Progress', 'Awaiting Parts', 'Completed'].map(s => (
                        <motion.button key={s} whileTap={{ scale: 0.95 }}
                          className={live.status === s ? 'btn btn-primary' : 'btn btn-ghost'}
                          style={{
                            fontSize: '0.82rem', padding: '0.7rem',
                            borderRadius: 10, gap: '0.4rem',
                            border: live.status === s ? undefined : '1px solid var(--border-2)',
                          }}
                          onClick={() => handleStatusUpdate(live.id, s)}>
                          {live.status === s && <Check size={13} />}
                          {s}
                        </motion.button>
                      ))}
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      🔒 Only technicians and admins can change ticket status.
                    </div>
                  </div>
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