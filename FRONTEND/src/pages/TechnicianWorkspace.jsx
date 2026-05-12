import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Save, AlertCircle, Terminal, PlusCircle, Tag } from 'lucide-react';
import { ticketsAPI } from '../services/api.js';
import ApiError from '../components/ApiError.jsx';

/** ── Mock data, removed when backend delivers queue ── */
const MOCK_QUEUE = [
  { id: 'RT-1043', device: 'Dell XPS 13 9310',   issue: 'Display artifacting',    status: 'In Progress',    urgent: true  },
  { id: 'RT-1046', device: 'HP Spectre x360',     issue: 'Power delivery fault',  status: 'In Progress',    urgent: false },
  { id: 'RT-1044', device: 'Lenovo ThinkPad X1', issue: 'Keyboard matrix failure',status: 'Awaiting Parts', urgent: false },
  { id: 'RT-1045', device: 'Custom ATX Build',    issue: 'Thermal throttling',     status: 'Received',       urgent: false },
];

const MOCK_DETAIL = {
  'RT-1043': {
    id: 'RT-1043', customer: 'Alice Smith', customerId: 'CUST-002',
    device: 'Dell XPS 13 9310', issue: 'Display artifacting',
    status: 'In Progress', date: '2026-05-11',
    clientNote: 'Screen flickers intensely when opening the lid past 90°. Intermittent vertical lines appear on the left side.',
    findings: 'Opened chassis and inspected eDP display cable. Cable is crimped near the hinge. Re-seated connector — issue persists. Requires full cable assembly replacement.',
    parts: ['Dell eDP Cable 30-pin (P/N: DC020024S00)'],
  },
};

const STATUS_COLORS = {
  'In Progress':    'var(--primary)',
  'Awaiting Parts': 'var(--warning)',
  'Received':       'var(--text-3)',
  'Completed':      'var(--success)',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } } };

const TechnicianWorkspace = () => {
  const [active, setActive]           = useState('RT-1043');
  const [findings, setFindings]       = useState(MOCK_DETAIL['RT-1043']?.findings ?? '');
  const [privateNote, setPrivateNote] = useState('');
  const [status, setStatus]           = useState(MOCK_DETAIL['RT-1043']?.status ?? 'In Progress');
  const [saving, setSaving]           = useState(false);

  const detail = MOCK_DETAIL[active];

  // ── Backend integration point ────────────────────────────────────────────
  // const { data: queue, loading: queueLoading } = useAsync(ticketsAPI.getMyQueue);
  // const { data: detail } = useAsync(() => ticketsAPI.getById(active), true, [active]);
  // const handleSave = async () => { await ticketsAPI.updateStatus(active, status, findings); }
  //
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // simulate API call
    setSaving(false);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ height: 'calc(100vh - 5rem)', display: 'flex', flexDirection: 'column' }}
    >
      <motion.div variants={item} className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title gradient-text">Diagnostic Matrix</h1>
          <p className="page-subtitle">Active hardware repair sessions</p>
        </div>
      </motion.div>

      <motion.div variants={item} style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>

        {/* ── Queue panel ── */}
        <div className="card" style={{ width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity size={16} color="var(--primary)" />
            <span className="display" style={{ fontSize: '0.9rem', letterSpacing: '0.02em' }}>My Queue</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {MOCK_QUEUE.map(t => (
              <motion.div
                key={t.id}
                whileHover={{ x: 4 }}
                onClick={() => setActive(t.id)}
                style={{
                  padding: '1rem', borderRadius: 12, cursor: 'pointer',
                  background: active === t.id ? 'var(--primary-dim)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${active === t.id ? 'rgba(0,229,255,0.35)' : 'var(--border-1)'}`,
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {t.urgent && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 24px 24px 0', borderColor: `transparent var(--warning) transparent transparent` }} />
                )}
                <div className="mono" style={{ fontSize: '0.8rem', color: active === t.id ? 'var(--primary)' : 'var(--text-3)', marginBottom: '0.4rem' }}>{t.id}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.35rem' }}>{t.device}</div>
                <div style={{ fontSize: '0.75rem', color: STATUS_COLORS[t.status] }}>{t.status}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Workspace panel ── */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header bar */}
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span className="mono" style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 700 }}>{active}</span>
                <span className="badge badge-progress">{status}</span>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
                {detail?.device} — <span style={{ color: 'var(--text-3)' }}>{detail?.issue}</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                className="input"
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ width: 'auto', padding: '0.55rem 1rem', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem' }}
              >
                <option>Received</option>
                <option>In Progress</option>
                <option>Awaiting Parts</option>
                <option>Completed</option>
              </select>
              <motion.button
                whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}
                className="btn btn-primary"
                onClick={handleSave}
                style={{ gap: '0.5rem' }}
              >
                {saving ? (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>Saving…</motion.span>
                ) : (
                  <><Save size={16} /> Update</>
                )}
              </motion.button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Client note */}
            {detail?.clientNote && (
              <div style={{ display: 'flex', gap: '1rem', padding: '1.25rem', borderRadius: 12, background: 'var(--warning-dim)', border: '1px solid rgba(255,94,138,0.2)' }}>
                <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="label" style={{ color: 'var(--warning)', marginBottom: '0.4rem' }}>Client Report</p>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{detail.clientNote}</p>
                </div>
              </div>
            )}

            {/* Diagnostic findings */}
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={13} /> Diagnostic Findings
              </label>
              <textarea
                className="input"
                value={findings}
                onChange={e => setFindings(e.target.value)}
                rows={5}
                style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.7 }}
              />
            </div>

            {/* Private notes */}
            <div>
              <label className="label">Internal Notes <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--text-3)' }}>(hidden from client)</span></label>
              <textarea
                className="input"
                value={privateNote}
                onChange={e => setPrivateNote(e.target.value)}
                rows={3}
                placeholder="Technical notes not visible to the customer…"
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Parts requisition */}
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={13} /> Parts Requisition
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input className="input" placeholder="Part number, OEM SKU, or description…" />
                <button className="btn btn-ghost" style={{ whiteSpace: 'nowrap', gap: '0.4rem' }}>
                  <PlusCircle size={16} /> Add
                </button>
              </div>
              {detail?.parts?.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {detail.parts.map(p => (
                    <span key={p} className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'none', letterSpacing: 0 }}>{p}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TechnicianWorkspace;
