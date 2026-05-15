import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import RepairTickets from './pages/RepairTickets.jsx';
import CustomerManagement from './pages/CustomerManagement.jsx';
import TechnicianWorkspace from './pages/TechnicianWorkspace.jsx';

const AmbientBackground = () => (
  <div className="ambient-bg">
    <div className="ambient-orb orb-1" />
    <div className="ambient-orb orb-2" />
    <div className="ambient-orb orb-3" />
  </div>
);

/** Determine the default landing page for each role after login */
const defaultRoute = (role) => {
  if (role === 'admin')        return '/dashboard';
  if (role === 'receptionist') return '/customers';
  if (role === 'technician')   return '/workspace';
  if (role === 'customer')     return '/tickets';
  return '/tickets';
};

function App() {
  const { isAuthenticated, user } = useAuth();
  const role = user?.role;

  return (
    <BrowserRouter>
      <AmbientBackground />
      <div className="app-container">
        {isAuthenticated && <Sidebar />}
        <main className="main-content">
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <>
                {/* Admin-only */}
                {role === 'admin' && (
                  <Route path="/dashboard" element={<AdminDashboard />} />
                )}

                {/* Admin + Receptionist */}
                {['admin', 'receptionist'].includes(role) && (
                  <Route path="/customers" element={<CustomerManagement />} />
                )}

                {/* All authenticated roles */}
                <Route path="/tickets" element={<RepairTickets />} />

                {/* Admin + Technician */}
                {['admin', 'technician'].includes(role) && (
                  <Route path="/workspace" element={<TechnicianWorkspace />} />
                )}

                {/* Catch-all: redirect to role's home */}
                <Route path="*" element={<Navigate to={defaultRoute(role)} replace />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
