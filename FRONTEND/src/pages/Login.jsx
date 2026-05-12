import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, Briefcase, Wrench, User, ArrowRight, Zap } from 'lucide-react';

const ROLES = [
  { value: 'admin',        label: 'Admin',       icon: ShieldAlert, desc: 'Full system access' },
  { value: 'receptionist', label: 'Reception',   icon: Briefcase,   desc: 'Ticket & client ops' },
  { value: 'technician',   label: 'Technician',  icon: Wrench,      desc: 'Diagnostic workspace' },
  { value: 'customer',     label: 'Client',      icon: User,        desc: 'View repair status' },
];

const Login = () => {
  const { login } = useAuth();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('demo@comprepair.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ── Backend integration point ──────────────────────────────────────────
    // When backend is live: login will call authAPI.login(email, password, role)
    // For now, we mock a short delay to simulate network request:
    await new Promise(r => setTimeout(r, 800));
    await login(email, password, role);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
        className="card"
        style={{ width: '100%', maxWidth: 440, padding: '3rem' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 20px var(--primary-glow)', '0 0 40px var(--primary-glow)', '0 0 20px var(--primary-glow)'] }}
            transition={{ repeat: Infinity, duration: 3 }}
            style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 1.5rem',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-deep))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Zap size={30} color="#000" fill="#000" />
          </motion.div>
          <h1 className="display" style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            System Access
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
            Authenticate to initialize your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Role Picker */}
          <div>
            <label className="label">Access Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {ROLES.map(({ value, label, icon: Icon, desc }) => {
                const active = role === value;
                return (
                  <motion.button
                    key={value}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setRole(value)}
                    style={{
                      padding: '0.875rem 0.75rem',
                      borderRadius: 12, cursor: 'pointer',
                      background: active ? 'var(--primary-dim)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(0,229,255,0.4)' : 'var(--border-1)'}`,
                      color: active ? 'var(--primary)' : 'var(--text-2)',
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem',
                      fontFamily: 'var(--font-display)',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={16} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: active ? 'rgba(0,229,255,0.7)' : 'var(--text-3)', fontFamily: 'var(--font-body)', fontWeight: 400 }}>{desc}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <input
              type="email" required
              className="input"
              placeholder="email@comprepair.ph"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="label">Security Key</label>
            <input
              type="password" required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.9rem', fontSize: '0.95rem' }}
          >
            {loading ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                Authenticating…
              </motion.span>
            ) : (
              <>Initialize Session <ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Login;
