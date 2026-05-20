import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ticketsAPI, customersAPI, dashboardAPI, usersAPI } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const role = user?.role ?? '';

  const isAdmin = role === 'admin';
  const isStaff = ['admin', 'receptionist'].includes(role);

  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!role) return;

    ticketsAPI.getAll()
      .then(setTickets)
      .catch(err => console.error('[DataContext] tickets fetch failed:', err));

    if (isStaff) {
      customersAPI.getAll()
        .then(setCustomers)
        .catch(err => console.error('[DataContext] customers fetch failed:', err));
    }

    if (isAdmin) {
      dashboardAPI.getStats()
        .then(setStats)
        .catch(err => console.error('[DataContext] stats fetch failed:', err));

      dashboardAPI.getActivity()
        .then(setActivity)
        .catch(err => console.error('[DataContext] activity fetch failed:', err));

      usersAPI.getAll()
        .then(setAllUsers)
        .catch(err => console.error('[DataContext] allUsers fetch failed:', err));
    }

    if (isStaff || role === 'technician') {
      usersAPI.getTechnicians()
        .then(setTechnicians)
        .catch(err => console.error('[DataContext] technicians fetch failed:', err));
    }
  }, [role]);

  const createTicket = useCallback(async (payload) => {
    const created = await ticketsAPI.create({
      customerId: payload.customerId || undefined,
      customerName: payload.customerName,
      device: payload.device,
      issue: payload.issue,
      clientNote: payload.clientNote ?? '',
      assignedTo: payload.assignedTo || undefined,
      status: payload.status ?? 'Received',
    });
    setTickets(prev => [created, ...prev]);
    if (isAdmin) dashboardAPI.getStats().then(setStats).catch(() => { });
    return created;
  }, [isAdmin]);

  const updateTicketStatus = useCallback(async (ticketId, newStatus) => {
    await ticketsAPI.updateStatus(ticketId, newStatus);
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: newStatus } : t
    ));
    if (isAdmin) {
      dashboardAPI.getActivity().then(setActivity).catch(() => { });
      dashboardAPI.getStats().then(setStats).catch(() => { });
    }
  }, [isAdmin]);

  const updateTicketWorkData = useCallback(async (ticketId, workData) => {
    await ticketsAPI.updateWorkData(ticketId, workData);
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, ...workData } : t
    ));
    if (isAdmin) {
      dashboardAPI.getActivity().then(setActivity).catch(() => { });
      dashboardAPI.getStats().then(setStats).catch(() => { });
    }
  }, [isAdmin]);

  const registerCustomer = useCallback(async (payload) => {
    const created = await customersAPI.create(payload);
    setCustomers(prev => [created, ...prev]);
    return created;
  }, []);

  const deleteTicket = useCallback(async (ticketId) => {
    await ticketsAPI.delete(ticketId);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (isAdmin) dashboardAPI.getStats().then(setStats).catch(() => {});
  }, [isAdmin]);

  const fetchAllUsers = useCallback(async () => {
    const users = await usersAPI.getAll();
    setAllUsers(users);
    return users;
  }, []);

  const updateUser = useCallback(async (userId, data) => {
    const updated = await usersAPI.update(userId, data);
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    return updated;
  }, []);

  const deleteUser = useCallback(async (userId) => {
    await usersAPI.delete(userId);
    setAllUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const getTicketsForTech = useCallback((techId) =>
    tickets.filter(t => t.assignedTo === techId && t.status !== 'Completed'),
    [tickets]
  );

  const getTicketsForCustomer = useCallback((customerId) =>
    tickets.filter(t => t.customerId === customerId),
    [tickets]
  );

  const getStats = useCallback(() => {
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const completed = tickets.filter(t => t.status === 'Completed').length;
    return {
      inProgress,
      completed,
      totalClients: customers.length,
      ...(stats ?? {}),
    };
  }, [tickets, customers, stats]);

  const refreshTickets = useCallback(async () => {
    const fresh = await ticketsAPI.getAll();
    setTickets(fresh);
  }, []);

  const refreshCustomers = useCallback(async () => {
    const fresh = await customersAPI.getAll();
    setCustomers(fresh);
  }, []);

  const refreshStats = useCallback(async () => {
    if (!isAdmin) return;
    const [freshStats, freshActivity] = await Promise.all([
      dashboardAPI.getStats(),
      dashboardAPI.getActivity(),
    ]);
    setStats(freshStats);
    setActivity(freshActivity);
  }, [isAdmin]);

  return (
    <DataContext.Provider value={{
      tickets,
      customers,
      technicians,
      allUsers,
      activity,
      createTicket,
      updateTicketStatus,
      updateTicketWorkData,
      registerCustomer,
      deleteTicket,
      fetchAllUsers,
      updateUser,
      deleteUser,
      getTicketsForTech,
      getTicketsForCustomer,
      getStats,
      refreshTickets,
      refreshCustomers,
      refreshStats,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};