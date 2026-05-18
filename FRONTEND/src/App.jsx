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

const defaultRoute = (role) => {
  if (role === 'admin') return '/dashboard';
  if (role === 'receptionist') return '/customers';
  if (role === 'technician') return '/workspace';
  if (role === 'customer') return '/tickets';
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
                {role === 'admin' && (
                  <Route path="/dashboard" element={<AdminDashboard />} />
                )}

                {['admin', 'receptionist'].includes(role) && (
                  <Route path="/customers" element={<CustomerManagement />} />
                )}

                <Route path="/tickets" element={<RepairTickets />} />

                {['admin', 'technician'].includes(role) && (
                  <Route path="/workspace" element={<TechnicianWorkspace />} />
                )}

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