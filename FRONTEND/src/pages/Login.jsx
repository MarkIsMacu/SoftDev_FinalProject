import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowRight, Zap, Mail, Lock } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    const ok = await login(email, password);
    if (!ok) setError('Invalid credentials. Please check your email and password.');
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
        style={{ width: '100%', maxWidth: 420, padding: '3rem' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 20px var(--primary-glow)', '0 0 44px var(--primary-glow)', '0 0 20px var(--primary-glow)'] }}
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
            CompRepair
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
            Sign in to access your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={12} /> Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={12} /> Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: '0.82rem', color: 'var(--warning)',
                textAlign: 'center', lineHeight: 1.5,
                padding: '0.6rem 1rem', borderRadius: 8,
                background: 'rgba(255,94,138,0.08)',
                border: '1px solid rgba(255,94,138,0.2)',
              }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            whileHover={!loading ? { y: -2 } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.95rem', fontSize: '0.95rem', gap: '0.5rem' }}
          >
            {loading ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                Authenticating…
              </motion.span>
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Login;