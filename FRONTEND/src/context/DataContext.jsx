/**
 * DataContext — Single source of truth for all shared app data.
 *
 * FRONTEND-ONLY PHASE:
 * All data mutations happen in memory. When the backend is ready,
 * replace the mock functions below with real API calls (e.g. ticketsAPI.create()).
 * Each function has a clearly marked "Backend integration point" comment.
 *
 * Data flow:
 *   Admin / Receptionist creates ticket  →  appears in Technician queue
 *   Technician updates findings/status   →  reflects in Repair Tickets table & Customer view
 *   Customer logs in                     →  sees only their own tickets
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { registerClientAccount } from '../store/accounts.js';

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_CUSTOMERS = [
  { id: 'CUST-001', name: 'John Doe',      phone: '+63 912 345 6789', email: 'john.doe@email.com',   activeRepairs: 1, totalRepairs: 3, joined: '2025-11-12', notes: 'Preferred contact via phone.', accountEmail: null },
  { id: 'CUST-002', name: 'Alice Smith',   phone: '+63 998 765 4321', email: 'alice.s@email.com',    activeRepairs: 1, totalRepairs: 1, joined: '2026-01-08', notes: '', accountEmail: null },
  { id: 'CUST-003', name: 'Bob Johnson',   phone: '+63 917 111 2222', email: 'b.johnson@email.com',  activeRepairs: 1, totalRepairs: 5, joined: '2024-07-23', notes: 'VIP client — priority handling.', accountEmail: null },
  { id: 'CUST-004', name: 'Charlie Brown', phone: '+63 922 333 4444', email: 'charlie.b@email.com',  activeRepairs: 0, totalRepairs: 2, joined: '2025-09-30', notes: '', accountEmail: null },
  { id: 'CUST-005', name: 'Diana Prince',  phone: '+63 933 444 5555', email: 'diana.p@email.com',    activeRepairs: 1, totalRepairs: 1, joined: '2026-04-19', notes: '', accountEmail: 'client@comprepair.ph' },
];

// Technician ID → name mapping (matches demo accounts in AuthContext)
export const TECHNICIANS = [
  { id: 'TECH-001', name: 'Lead Technician', email: 'tech@comprepair.ph' },
];

const SEED_TICKETS = [
  {
    id: 'RT-1042', customerId: 'CUST-001', customerName: 'John Doe',
    device: 'MacBook Pro 16" M1',  issue: 'Battery degradation',
    status: 'Completed',      date: '2026-05-10', assignedTo: 'TECH-001',
    findings: 'Battery health at 62%. Replaced with OEM battery unit. Charge cycle tested and confirmed nominal.',
    clientNote: 'Battery dying within 2 hours of full charge.',
    parts: ['Apple OEM Battery 100Wh (A2166)'],
    privateNote: 'Warranty expired. Full cost charged.',
    activityLog: [
      { action: 'Ticket created', by: 'Reception Staff', time: '2026-05-10 09:00' },
      { action: 'Status → In Progress', by: 'Lead Technician', time: '2026-05-10 10:15' },
      { action: 'Status → Completed', by: 'Lead Technician', time: '2026-05-10 14:30' },
    ],
  },
  {
    id: 'RT-1043', customerId: 'CUST-002', customerName: 'Alice Smith',
    device: 'Dell XPS 13 9310',    issue: 'Display artifacting',
    status: 'In Progress',    date: '2026-05-11', assignedTo: 'TECH-001',
    findings: 'Opened chassis and inspected eDP display cable. Cable is crimped near the hinge. Re-seated connector — issue persists. Requires full cable assembly replacement.',
    clientNote: 'Screen flickers intensely when opening the lid past 90°. Intermittent vertical lines appear on the left side.',
    parts: ['Dell eDP Cable 30-pin (P/N: DC020024S00)'],
    privateNote: '',
    activityLog: [
      { action: 'Ticket created', by: 'Admin User', time: '2026-05-11 08:30' },
      { action: 'Status → In Progress', by: 'Lead Technician', time: '2026-05-11 11:00' },
    ],
  },
  {
    id: 'RT-1044', customerId: 'CUST-003', customerName: 'Bob Johnson',
    device: 'Lenovo ThinkPad X1', issue: 'Keyboard matrix failure',
    status: 'Awaiting Parts', date: '2026-05-11', assignedTo: 'TECH-001',
    findings: 'Keyboard matrix scan confirmed failure on column 7. Liquid corrosion visible on the ribbon connector. Full keyboard assembly replacement required.',
    clientNote: 'Several keys on the right side of the keyboard stopped working after a spill. Keys: K, L, O, P, semicolon.',
    parts: ['Lenovo ThinkPad X1 Carbon Keyboard Assy (P/N: 01YP040)', 'Ribbon Cable 40-pin FFC'],
    privateNote: 'Parts ordered from supplier. ETA: 2-3 days.',
    activityLog: [
      { action: 'Ticket created', by: 'Reception Staff', time: '2026-05-11 09:45' },
      { action: 'Status → In Progress', by: 'Lead Technician', time: '2026-05-11 13:00' },
      { action: 'Status → Awaiting Parts', by: 'Lead Technician', time: '2026-05-11 15:20' },
    ],
  },
  {
    id: 'RT-1045', customerId: 'CUST-004', customerName: 'Charlie Brown',
    device: 'Custom ATX Build',    issue: 'Thermal throttling',
    status: 'Received',       date: '2026-05-12', assignedTo: 'TECH-001',
    findings: 'Initial inspection pending. Unit received and logged.',
    clientNote: 'PC slows down heavily during gaming. CPU usage drops to 0% for brief moments. Temps seem fine according to HWMonitor.',
    parts: [],
    privateNote: '',
    activityLog: [
      { action: 'Ticket created', by: 'Reception Staff', time: '2026-05-12 10:00' },
    ],
  },
  {
    id: 'RT-1046', customerId: 'CUST-005', customerName: 'Diana Prince',
    device: 'HP Spectre x360',     issue: 'Power delivery fault',
    status: 'In Progress',    date: '2026-05-12', assignedTo: 'TECH-001',
    findings: 'Charging board tested — output voltage inconsistent. Likely failed charging IC or damaged charging port. Further investigation needed.',
    clientNote: 'Laptop charges intermittently. Sometimes shows "plugged in, not charging." Tried multiple chargers — same result.',
    parts: [],
    privateNote: '',
    activityLog: [
      { action: 'Ticket created', by: 'Admin User', time: '2026-05-12 09:15' },
      { action: 'Status → In Progress', by: 'Lead Technician', time: '2026-05-12 11:30' },
    ],
  },
];

// ── Context ───────────────────────────────────────────────────────────────────
const DataContext = createContext(null);

let ticketCounter = 1047; // auto-increment for new ticket IDs

export const DataProvider = ({ children }) => {
  const [tickets,   setTickets]   = useState(SEED_TICKETS);
  const [customers, setCustomers] = useState(SEED_CUSTOMERS);

  // ── Activity log helper ──────────────────────────────────────────────────
  const appendLog = (ticketId, action, byName) => {
    const now = new Date();
    const ts = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, activityLog: [...(t.activityLog ?? []), { action, by: byName, time: ts }] }
        : t
    ));
  };

  // ── Ticket CRUD ──────────────────────────────────────────────────────────

  /**
   * createTicket — called by Admin / Receptionist from RepairTickets page.
   * Immediately visible in TechnicianWorkspace queue.
   *
   * Backend integration point:
   *   const created = await ticketsAPI.create(payload);
   *   setTickets(prev => [created, ...prev]);
   */
  const createTicket = useCallback((payload, createdByName) => {
    const id  = `RT-${ticketCounter++}`;
    const now = new Date().toISOString().split('T')[0];
    const ticket = {
      id,
      customerId:    payload.customerId ?? 'CUST-WALK',
      customerName:  payload.customerName,
      device:        payload.device,
      issue:         payload.issue,
      status:        payload.status ?? 'Received',
      date:          now,
      assignedTo:    payload.assignedTo ?? 'TECH-001', // default to first tech
      findings:      '',
      clientNote:    payload.clientNote ?? '',
      parts:         [],
      privateNote:   '',
      activityLog:   [{ action: 'Ticket created', by: createdByName, time: `${now} ${new Date().toTimeString().slice(0, 5)}` }],
    };
    setTickets(prev => [ticket, ...prev]);
    return ticket;
  }, []);

  /**
   * updateTicketStatus — called from RepairTickets and TechnicianWorkspace.
   * Shared update, so both views reflect the change immediately.
   */
  const updateTicketStatus = useCallback((ticketId, newStatus, byName) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: newStatus } : t
    ));
    appendLog(ticketId, `Status → ${newStatus}`, byName);
  }, []);

  /**
   * updateTicketWorkData — called from TechnicianWorkspace when saving.
   * Persists findings, parts, privateNote, and status changes made by the tech.
   */
  const updateTicketWorkData = useCallback((ticketId, workData, byName) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, ...workData } : t
    ));
    if (workData.status) appendLog(ticketId, `Status → ${workData.status}`, byName);
    else appendLog(ticketId, 'Findings/notes updated', byName);
  }, []);

  // ── Customer CRUD ─────────────────────────────────────────────────────────

  /**
   * registerCustomer — called by Admin / Receptionist from CustomerManagement.
   * Also registers the login account immediately so the client can sign in right away.
   *
   * payload must include:
   *   name, phone, email (contact), notes,
   *   loginEmail   — the @comprepair.ph email the client uses to log in
   *   tempPassword — temporary password staff shares with the client
   *
   * Backend integration point:
   *   const created = await customersAPI.create(payload);
   *   // backend creates both the DB record AND the login account, sends welcome email
   *   setCustomers(prev => [created, ...prev]);
   */
  const registerCustomer = useCallback((payload) => {
    const id = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    const customer = {
      id,
      name:          payload.name,
      phone:         payload.phone,
      email:         payload.email,           // personal / contact email
      notes:         payload.notes ?? '',
      accountEmail:  payload.loginEmail ?? null, // the login email
      activeRepairs: 0,
      totalRepairs:  0,
      joined:        new Date().toISOString().split('T')[0],
    };
    setCustomers(prev => [customer, ...prev]);
    // Register login account so the client can sign in immediately
    if (payload.loginEmail && payload.tempPassword) {
      registerClientAccount(payload.loginEmail, payload.name, payload.tempPassword, id);
    }
    return customer;
  }, [customers.length]);

  // ── Derived getters ───────────────────────────────────────────────────────

  /** Get all tickets assigned to a specific technician */
  const getTicketsForTech = useCallback((techId) =>
    tickets.filter(t => t.assignedTo === techId && t.status !== 'Completed'),
    [tickets]
  );

  /** Get tickets belonging to a specific customer (by customerId or customerName) */
  const getTicketsForCustomer = useCallback((customerId) =>
    tickets.filter(t => t.customerId === customerId),
    [tickets]
  );

  /** Compute live KPI stats from real ticket data */
  const getStats = useCallback(() => {
    const inProgress   = tickets.filter(t => t.status === 'In Progress').length;
    const completed    = tickets.filter(t => t.status === 'Completed').length;
    return { inProgress, completed, totalClients: customers.length };
  }, [tickets, customers]);

  return (
    <DataContext.Provider value={{
      tickets, customers,
      createTicket, updateTicketStatus, updateTicketWorkData,
      registerCustomer,
      getTicketsForTech, getTicketsForCustomer, getStats,
      TECHNICIANS,
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
