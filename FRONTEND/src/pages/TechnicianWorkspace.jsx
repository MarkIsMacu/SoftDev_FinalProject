import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Save, AlertCircle, Terminal, PlusCircle, Tag, X, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_COLORS = {
  'In Progress': 'var(--primary)',
  'Awaiting Parts': 'var(--warning)',
  'Received': 'var(--text-3)',
  'Completed': 'var(--success)',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } } };

const Toast = ({ msg, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.95 }}
    style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
      background: 'var(--bg-surface-2)', border: '1px solid var(--border-2)',
      borderRadius: 14, padding: '1rem 1.5rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}
  >
    <CheckCircle size={18} color="var(--success)" style={{ flexShrink: 0 }} />
    <span style={{ fontSize: '0.9rem', color: 'var(--text-1)', flex: 1 }}>{msg}</span>
    <button className="btn btn-ghost" onClick={onClose} style={{ padding: '0.25rem', minWidth: 0, borderRadius: 8, flexShrink: 0 }}>
      <X size={14} />
    </button>
  </motion.div>
);

const TechnicianWorkspace = () => {
  const { user } = useAuth();
  const { tickets, technicians, updateTicketWorkData } = useData();

  const myTech = technicians.find(t => t.email === user?.email) ?? technicians[0];
  const myTechId = myTech?.id ?? null;

  const queue = myTechId
    ? tickets.filter(t => t.assignedTo === myTechId && t.status !== 'Completed')
    : [];

  const [activeId, setActiveId] = useState(null);
  const [localWork, setLocalWork] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!activeId && queue.length > 0) setActiveId(queue[0].id);
  }, [queue, activeId]);

  const handleSelectTicket = (id) => {
    setActiveId(id);
    if (!localWork[id]) {
      const t = tickets.find(x => x.id === id);
      if (t) {
        setLocalWork(prev => ({
          ...prev,
          [id]: {
            findings: t.findings ?? '',
            privateNote: t.privateNote ?? '',
            parts: [...(t.parts ?? [])],
            partInput: '',
            status: t.status,
          },
        }));
      }
    }
  };

  const getWork = (id) => {
    if (localWork[id]) return localWork[id];
    const t = tickets.find(x => x.id === id);
    return {
      findings: t?.findings ?? '',
      privateNote: t?.privateNote ?? '',
      parts: [...(t?.parts ?? [])],
      partInput: '',
      status: t?.status ?? 'Received',
    };
  };

  const updateLocal = (id, key, value) =>
    setLocalWork(prev => ({
      ...prev,
      [id]: { ...getWork(id), ...prev[id], [key]: value },
    }));

  const activeTicket = tickets.find(t => t.id === activeId);
  const work = activeId ? getWork(activeId) : null;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleSave = async () => {
    if (!activeId || !work) return;
    setSaving(true);
    try {
      await updateTicketWorkData(activeId, {
        findings: work.findings,
        privateNote: work.privateNote,
        parts: work.parts,
        status: work.status,
      });
      const code = activeTicket?.ticketCode ?? activeId;
      showToast(`${code} saved — status: ${work.status}`);
    } catch (err) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPart = () => {
    const val = work?.partInput?.trim();
    if (!val || !activeId) return;
    updateLocal(activeId, 'parts', [...(work.parts ?? []), val]);
    updateLocal(activeId, 'partInput', '');
  };

  const handleRemovePart = (part) => {
    if (!activeId) return;
    updateLocal(activeId, 'parts', (work.parts ?? []).filter(p => p !== part));
  };

  if (!myTechId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⚙️</div>
        <h2 className="display" style={{ fontSize: '1.4rem', color: 'var(--text-2)' }}>Loading workspace…</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>Fetching technician profile.</p>
      </motion.div>
    );
  }

  if (queue.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>🛠️</div>
        <h2 className="display" style={{ fontSize: '1.4rem', color: 'var(--text-2)' }}>Queue is empty</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.9rem' }}>No active repair tickets assigned to you.</p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ height: 'calc(100vh - 5rem)', display: 'flex', flexDirection: 'column' }}>

        <motion.div variants={item} className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title gradient-text">Diagnostic Matrix</h1>
            <p className="page-subtitle">Active hardware repair sessions · {queue.length} in queue</p>
          </div>
        </motion.div>

        <motion.div variants={item} style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>

          <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Activity size={16} color="var(--primary)" />
              <span className="display" style={{ fontSize: '0.9rem' }}>My Queue</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-3)' }}>{queue.length} tickets</span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {queue.map(t => {
                const liveStatus = localWork[t.id]?.status ?? t.status;
                return (
                  <motion.div key={t.id}
                    whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectTicket(t.id)}
                    style={{
                      padding: '1rem', borderRadius: 12, cursor: 'pointer',
                      background: activeId === t.id ? 'var(--primary-dim)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${activeId === t.id ? 'rgba(0,229,255,0.35)' : 'var(--border-1)'}`,
                      transition: 'all 0.2s',
                    }}
                  >
                    <div className="mono" style={{ fontSize: '0.78rem', color: activeId === t.id ? 'var(--primary)' : 'var(--text-3)', marginBottom: '0.3rem' }}>
                      {t.ticketCode ?? t.id}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.3 }}>{t.device}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginBottom: '0.4rem', lineHeight: 1.4 }}>{t.issue}</div>
                    <div style={{ fontSize: '0.72rem', color: STATUS_COLORS[liveStatus] ?? 'var(--text-3)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                      ● {liveStatus}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {activeTicket && work ? (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                    <span className="mono" style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {activeTicket.ticketCode ?? activeId}
                    </span>
                    <span className="badge badge-progress">{work.status}</span>
                    <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      client: {activeTicket.customerName}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>
                    {activeTicket.device} — <span style={{ color: 'var(--text-3)' }}>{activeTicket.issue}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                  <select className="input"
                    value={work.status}
                    onChange={e => updateLocal(activeId, 'status', e.target.value)}
                    style={{ width: 'auto', padding: '0.5rem 1rem', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem' }}>
                    <option value="Received">Received</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Awaiting Parts">Awaiting Parts</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <motion.button className="btn btn-primary"
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={handleSave} style={{ gap: '0.5rem' }}>
                    {saving
                      ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Saving…</motion.span>
                      : <><Save size={16} /> Save & Update</>
                    }
                  </motion.button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                {activeTicket.clientNote && (
                  <div style={{ display: 'flex', gap: '1rem', padding: '1.25rem', borderRadius: 12, background: 'var(--warning-dim)', border: '1px solid rgba(255,94,138,0.2)' }}>
                    <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p className="label" style={{ color: 'var(--warning)', marginBottom: '0.4rem' }}>Client Report</p>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{activeTicket.clientNote}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Terminal size={13} /> Diagnostic Findings
                    <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)', fontSize: '0.7rem' }}>(visible to client and admin)</span>
                  </label>
                  <textarea className="input"
                    value={work.findings}
                    onChange={e => updateLocal(activeId, 'findings', e.target.value)}
                    rows={5}
                    placeholder="Document your diagnostic findings here…"
                    style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7 }} />
                </div>

                <div>
                  <label className="label">
                    Internal Notes <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(hidden from client)</span>
                  </label>
                  <textarea className="input"
                    value={work.privateNote}
                    onChange={e => updateLocal(activeId, 'privateNote', e.target.value)}
                    rows={3}
                    placeholder="Technical notes, supplier contacts, pricing notes…"
                    style={{ resize: 'vertical' }} />
                </div>

                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Tag size={13} /> Parts Requisition
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input className="input"
                      placeholder="Part number, OEM SKU, or description…"
                      value={work.partInput ?? ''}
                      onChange={e => updateLocal(activeId, 'partInput', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPart(); } }} />
                    <motion.button className="btn btn-ghost"
                      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                      style={{ whiteSpace: 'nowrap', gap: '0.4rem' }}
                      onClick={handleAddPart}>
                      <PlusCircle size={16} /> Add
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {(work.parts ?? []).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(work.parts ?? []).map(p => (
                          <motion.span key={p}
                            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                            className="badge badge-neutral"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', textTransform: 'none', letterSpacing: 0, gap: '0.5rem', paddingRight: '0.5rem' }}>
                            {p}
                            <button onClick={() => handleRemovePart(p)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0, lineHeight: 1 }}>
                              <X size={11} />
                            </button>
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {activeTicket.activityLog?.length > 0 && (
                  <div style={{ padding: '1.25rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-1)' }}>
                    <p className="label" style={{ marginBottom: '0.75rem' }}>Activity Log</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeTicket.activityLog.map((e, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-2)' }}>{e.action} <span style={{ color: 'var(--text-3)' }}>· {e.by}</span></span>
                          <span className="mono" style={{ color: 'var(--text-3)', fontSize: '0.7rem' }}>{e.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-3)' }}>Select a ticket from the queue to begin.</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
};

export default TechnicianWorkspace;