import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Phone, Mail, ChevronRight, RefreshCw, X, User, Clock, Wrench, Copy, Check, KeyRound } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { suggestLoginEmail, generateTempPassword } from '../store/accounts.js';

const STATUS_CFG = {
  'Completed': { cls: 'badge-completed', label: 'Completed' },
  'In Progress': { cls: 'badge-progress', label: 'In Progress' },
  'In_Progress': { cls: 'badge-progress', label: 'In Progress' },
  'Awaiting Parts': { cls: 'badge-waiting', label: 'Awaiting Parts' },
  'Awaiting_Parts': { cls: 'badge-waiting', label: 'Awaiting Parts' },
  'Received': { cls: 'badge-neutral', label: 'Received' },
};

const row = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const Modal = ({ title, children, onClose, maxW = 560 }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
    <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0 }}
      onClick={e => e.stopPropagation()} className="card"
      style={{ width: '100%', maxWidth: maxW, padding: '2rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <h2 className="display" style={{ fontSize: '1.2rem' }}>{title}</h2>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.35rem', minWidth: 0, borderRadius: 8 }}><X size={16} /></button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
    </motion.div>
  </motion.div>
);

const CredRow = ({ label, value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', gap: '1rem' }}>
      <div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: '0.2rem' }}>{label}</div>
        <div className="mono" style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700 }}>{value}</div>
      </div>
      <button className="btn btn-ghost" onClick={copy} style={{ padding: '0.4rem 0.8rem', gap: '0.35rem', fontSize: '0.78rem', flexShrink: 0 }}>
        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
      </button>
    </div>
  );
};

const EMPTY_FORM = { name: '', phone: '', email: '', loginEmail: '', tempPassword: '', notes: '' };

const CustomerManagement = () => {
  const { customers, tickets, registerCustomer, refreshCustomers } = useData();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErr, setFormErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const visible = useMemo(() =>
    customers.filter(c => !search || [c.name, c.phone, c.email, c.id, c.accountEmail].some(v => v?.toLowerCase().includes(search.toLowerCase()))),
    [customers, search]
  );

  const initials = n => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  const getActive = id => tickets.filter(t => t.customerId === id && t.status !== 'Completed').length;
  const getTotal = id => tickets.filter(t => t.customerId === id).length;
  const getHistory = id => tickets.filter(t => t.customerId === id);

  const handleNameChange = (val) => {
    const suggested = suggestLoginEmail(val);
    const pass = generateTempPassword(val);
    setForm(f => ({
      ...f,
      name: val,
      loginEmail: f.loginEmail || suggested,
      tempPassword: f.tempPassword || pass,
    }));
    setFormErr('');
  };

  const openRegister = () => {
    setForm(EMPTY_FORM);
    setFormErr('');
    setCredentials(null);
    setModal('register');
  };

  const handleRegister = async () => {
    if (!form.name.trim()) { setFormErr('Full name is required.'); return; }
    if (!form.phone.trim()) { setFormErr('Phone number is required.'); return; }
    if (form.phone.replace(/[^0-9]/g, '').length < 7) { setFormErr('Phone number must have at least 7 digits.'); return; }
    if (!form.email.trim()) { setFormErr('Contact email is required.'); return; }
    if (!form.loginEmail.trim()) { setFormErr('Login email is required.'); return; }
    if (!form.loginEmail.includes('@')) { setFormErr('Login email must contain @'); return; }
    if (!form.tempPassword.trim()) { setFormErr('A temporary password is required.'); return; }
    if (form.tempPassword.trim().length < 6) { setFormErr('Password must be at least 6 characters.'); return; }

    setSubmitting(true);
    setFormErr('');

    try {
      await registerCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
        loginEmail: form.loginEmail.trim().toLowerCase(),
        tempPassword: form.tempPassword.trim(),
      });

      setCredentials({
        name: form.name.trim(),
        loginEmail: form.loginEmail.trim().toLowerCase(),
        tempPassword: form.tempPassword.trim(),
      });
      setModal('credentials');
    } catch (err) {
      setFormErr(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={row} className="page-header">
          <div>
            <h1 className="page-title gradient-text">Client Registry</h1>
            <p className="page-subtitle">Global directory of customer profiles and service history</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.button className="btn btn-ghost" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={refreshCustomers}>
              <RefreshCw size={16} />
            </motion.button>
            <motion.button id="btn-register-client" className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={openRegister} style={{ gap: '0.4rem' }}>
              <UserPlus size={18} /> Register Client
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={row} className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="search-bar-wrap" style={{ flex: 1 }}>
              <Search size={16} className="search-icon" />
              <input className="input" placeholder="Search by name, phone, email, or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Client</th><th>Contact</th><th>Login Email</th><th>Active</th><th>Total</th><th>Actions</th></tr></thead>
              <motion.tbody variants={container} initial="hidden" animate="show">
                {visible.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No clients found.</td></tr>
                ) : visible.map(c => (
                  <motion.tr key={c.id} variants={row} style={{ cursor: 'pointer' }} onClick={() => setModal({ type: 'profile', customer: c })}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--primary-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                          {initials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</div>
                          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.2rem' }}><Phone size={13} color="var(--text-3)" /> {c.phone}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-2)' }}><Mail size={13} color="var(--text-3)" /> {c.email}</div>
                    </td>
                    <td>
                      {c.accountEmail
                        ? <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>{c.accountEmail}</span>
                        : <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td>{getActive(c.id) > 0 ? <span className="badge badge-progress">{getActive(c.id)} Active</span> : <span className="badge badge-neutral">None</span>}</td>
                    <td><span className="display" style={{ fontSize: '1.4rem', fontWeight: 700, color: getTotal(c.id) >= 4 ? 'var(--primary)' : 'var(--text-1)' }}>{getTotal(c.id)}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                        <motion.button className="btn btn-ghost" whileHover={{ y: -1 }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.3rem' }} onClick={() => setModal({ type: 'profile', customer: c })}><User size={13} /> Profile</motion.button>
                        <motion.button className="btn btn-ghost" whileHover={{ y: -1 }} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: '0.3rem' }} onClick={() => setModal({ type: 'history', customer: c })}>History <ChevronRight size={14} /></motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'right' }}>{customers.length} registered clients total</div>
        </motion.div>
      </motion.div>

      <AnimatePresence>

        {modal === 'register' && (
          <Modal title="Register New Client" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-1)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '0.75rem' }}>Client Information</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="label">Full Name *</label>
                      <span style={{ fontSize: '0.68rem', color: form.name.length > 72 ? 'var(--warning)' : 'var(--text-3)' }}>{form.name.length}/80</span>
                    </div>
                    <input className="input" placeholder="e.g. Juan dela Cruz"
                      maxLength={80}
                      value={form.name}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s.\-']/g, '');
                        handleNameChange(cleaned);
                      }} />
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>Letters and spaces only</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="label">Phone *</label>
                        <span style={{ fontSize: '0.68rem', color: form.phone.length > 13 ? 'var(--warning)' : 'var(--text-3)' }}>{form.phone.length}/15</span>
                      </div>
                      <input className="input"
                        placeholder="+63 9XX XXX XXXX"
                        maxLength={15}
                        inputMode="tel"
                        value={form.phone}
                        onChange={e => {
                          const cleaned = e.target.value.replace(/[^0-9+\-\s]/g, '');
                          setForm(f => ({ ...f, phone: cleaned }));
                          setFormErr('');
                        }} />
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>Numbers only (+, -, spaces allowed)</p>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="label">Contact Email *</label>
                        <span style={{ fontSize: '0.68rem', color: form.email.length > 90 ? 'var(--warning)' : 'var(--text-3)' }}>{form.email.length}/100</span>
                      </div>
                      <input className="input" type="email"
                        placeholder="personal@gmail.com"
                        maxLength={100}
                        value={form.email}
                        onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErr(''); }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="label">Notes <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(optional)</span></label>
                      <span style={{ fontSize: '0.68rem', color: form.notes.length > 270 ? 'var(--warning)' : 'var(--text-3)' }}>{form.notes.length}/300</span>
                    </div>
                    <textarea className="input" rows={2}
                      placeholder="Special notes about this client…"
                      maxLength={300}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      style={{ resize: 'vertical' }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <KeyRound size={13} color="var(--primary)" />
                  <p style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Login Credentials <span style={{ color: 'var(--text-3)', textTransform: 'none', fontWeight: 400 }}>(share with client)</span></p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="label">Login Email * <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(must contain @)</span></label>
                      <span style={{ fontSize: '0.68rem', color: form.loginEmail.length > 90 ? 'var(--warning)' : 'var(--text-3)' }}>{form.loginEmail.length}/100</span>
                    </div>
                    <input className="input"
                      placeholder="firstname.lastname@comprepair.ph"
                      maxLength={100}
                      value={form.loginEmail}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\s/g, '');
                        setForm(f => ({ ...f, loginEmail: cleaned }));
                        setFormErr('');
                      }} />
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: '0.25rem' }}>Auto-suggested from name. No spaces allowed.</p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="label">Temporary Password *</label>
                      <span style={{ fontSize: '0.68rem', color: form.tempPassword.length > 27 ? 'var(--warning)' : form.tempPassword.length < 6 && form.tempPassword.length > 0 ? 'var(--warning)' : 'var(--text-3)' }}>
                        {form.tempPassword.length}/30
                      </span>
                    </div>
                    <input className="input"
                      placeholder="e.g. Juan@CR2026"
                      minLength={6}
                      maxLength={30}
                      value={form.tempPassword}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\s/g, '');
                        setForm(f => ({ ...f, tempPassword: cleaned }));
                        setFormErr('');
                      }} />
                    <p style={{ fontSize: '0.68rem', color: form.tempPassword.length > 0 && form.tempPassword.length < 6 ? 'var(--warning)' : 'var(--text-3)', marginTop: '0.25rem' }}>
                      {form.tempPassword.length > 0 && form.tempPassword.length < 6
                        ? `⚠ Minimum 6 characters (${6 - form.tempPassword.length} more needed)`
                        : 'Min 6 characters, max 30. No spaces. Auto-generated.'}
                    </p>
                  </div>
                </div>
              </div>

              {formErr && (
                <p style={{ fontSize: '0.82rem', color: 'var(--warning)', padding: '0.5rem 0.75rem', background: 'rgba(255,94,138,0.08)', borderRadius: 8, border: '1px solid rgba(255,94,138,0.2)' }}>
                  {formErr}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <motion.button className="btn btn-primary" style={{ flex: 1, gap: '0.4rem' }}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRegister}
                  disabled={submitting}>
                  {submitting
                    ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Registering…</motion.span>
                    : <><UserPlus size={15} /> Register & Create Account</>
                  }
                </motion.button>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </div>
          </Modal>
        )}

        {modal === 'credentials' && credentials && (
          <Modal title="✅ Client Registered!" onClose={() => setModal(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(0,255,163,0.06)', border: '1px solid rgba(0,255,163,0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--success)', lineHeight: 1.6 }}>
                  <strong>{credentials.name}</strong> has been registered and can now log in to the portal.
                  Share the credentials below with the client.
                </p>
              </div>

              <div>
                <p className="label" style={{ marginBottom: '0.75rem' }}>Login Credentials</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <CredRow label="Login Email" value={credentials.loginEmail} />
                  <CredRow label="Temporary Password" value={credentials.tempPassword} />
                </div>
              </div>

              <div style={{ padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(255,94,138,0.06)', border: '1px solid rgba(255,94,138,0.15)', fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                ⚠️ The client should change their password after first login. These credentials are only shown once.
              </div>

              <motion.button className="btn btn-primary" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setModal(null)}>
                Done
              </motion.button>
            </div>
          </Modal>
        )}

        {modal?.type === 'profile' && (() => {
          const c = modal.customer;
          const total = getTotal(c.id); const active = getActive(c.id);
          return (
            <Modal title="Client Profile" onClose={() => setModal(null)}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent), var(--primary-deep))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: '#fff' }}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.name}</div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.id}</div>
                  </div>
                </div>
                <div className="divider" />
                {[
                  { label: 'Phone', value: c.phone },
                  { label: 'Contact Email', value: c.email },
                  { label: 'Login Email', value: c.accountEmail ?? '—' },
                  { label: 'Client Since', value: c.joined },
                  { label: 'Active Tickets', value: active > 0 ? `${active} active` : 'None' },
                  { label: 'Total Repairs', value: total },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{label}</span>
                    <span className={label === 'Login Email' ? 'mono' : ''} style={{ fontSize: '0.9rem', color: label === 'Login Email' ? 'var(--primary)' : 'var(--text-1)' }}>{value}</span>
                  </div>
                ))}
                {c.notes && <><div className="divider" /><div><p className="label">Notes</p><p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{c.notes}</p></div></>}
                <motion.button className="btn btn-primary" whileHover={{ y: -2 }} onClick={() => setModal({ type: 'history', customer: c })} style={{ gap: '0.4rem', marginTop: '0.25rem' }}>
                  <Clock size={15} /> View Repair History ({total})
                </motion.button>
              </div>
            </Modal>
          );
        })()}

        {modal?.type === 'history' && (() => {
          const history = getHistory(modal.customer.id);
          return (
            <Modal title={`Repair History — ${modal.customer.name}`} onClose={() => setModal(null)}>
              {history.length === 0
                ? <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '2rem 0' }}>No repair history found.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.map(r => (
                    <div key={r.id} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>{r.ticketCode ?? r.id}</span>
                        <span className={`badge ${STATUS_CFG[r.status]?.cls ?? 'badge-neutral'}`}>{STATUS_CFG[r.status]?.label ?? r.status}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600 }}><Wrench size={13} color="var(--text-3)" /> {r.device}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{r.issue}</div>
                      {r.findings && <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>{r.findings.slice(0, 140)}{r.findings.length > 140 ? '…' : ''}</div>}
                      <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{r.date}</div>
                    </div>
                  ))}
                </div>
              }
            </Modal>
          );
        })()}

      </AnimatePresence>
    </>
  );
};

export default CustomerManagement;