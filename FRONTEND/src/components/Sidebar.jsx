import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Wrench, FileText, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin'] },
  { to: '/customers', icon: Users, label: 'Clients', roles: ['admin', 'receptionist'] },
  { to: '/tickets', icon: FileText, label: 'Tickets', roles: ['admin', 'receptionist', 'technician', 'customer'] },
  { to: '/workspace', icon: Wrench, label: 'Workshop', roles: ['admin', 'technician'] },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role ?? '';

  const visible = navItems.filter(n => n.roles.includes(role));

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        width: 80,
        height: 'calc(100vh - 32px)',
        margin: '16px 0 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 0',
        flexShrink: 0,
        zIndex: 20,
      }}
      className="card"
    >
      <motion.div
        whileHover={{ scale: 1.08, rotate: 5 }}
        style={{
          width: 40, height: 40, borderRadius: 12, marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-deep))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px var(--primary-glow)',
          cursor: 'pointer',
        }}
      >
        <Zap size={20} color="#000" fill="#000" />
      </motion.div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {visible.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: 48, height: 48,
                  borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--primary-dim)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(0,229,255,0.35)' : 'transparent'}`,
                  color: isActive ? 'var(--primary)' : 'var(--text-3)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'color 0.2s, background 0.2s, border-color 0.2s',
                  boxShadow: isActive ? 'inset 0 0 20px var(--primary-dim)' : 'none',
                }}
                title={label}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    style={{
                      position: 'absolute', right: -1, top: '25%', bottom: '25%',
                      width: 3, borderRadius: '3px 0 0 3px',
                      background: 'var(--primary)',
                      boxShadow: '0 0 10px var(--primary)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={logout}
        className="btn btn-danger-ghost"
        style={{ width: 48, height: 48, borderRadius: 14, padding: 0, marginTop: 'auto' }}
        title="Sign Out"
      >
        <LogOut size={18} />
      </motion.button>
    </motion.aside>
  );
};

export default Sidebar;