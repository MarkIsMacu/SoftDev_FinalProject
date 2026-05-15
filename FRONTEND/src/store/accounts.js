/**
 * accounts.js — Shared login registry (frontend-only phase).
 *
 * This is a plain mutable JS object (not a React context) so it can be
 * imported and mutated by both AuthContext and DataContext without
 * circular dependency issues.
 *
 * Backend integration point:
 *   Remove this file entirely. AuthContext.login() will call authAPI.login()
 *   and the backend returns the authenticated user with role + customerId.
 *   DataContext.registerCustomer() will call customersAPI.create() which
 *   creates both the customer record AND the login account on the server.
 */

/**
 * The registry — keyed by lowercase email.
 * Each entry: { role, name, password, customerId }
 *   role        — 'admin' | 'receptionist' | 'technician' | 'customer'
 *   name        — display name shown in the UI
 *   password    — plaintext (frontend demo only — NEVER do this in production)
 *   customerId  — only for 'customer' role; links to DataContext customer record
 */
const REGISTRY = {
  'admin@comprepair.ph':     { role: 'admin',        name: 'Admin User',      password: 'password123', customerId: null },
  'reception@comprepair.ph': { role: 'receptionist', name: 'Reception Staff', password: 'password123', customerId: null },
  'tech@comprepair.ph':      { role: 'technician',   name: 'Lead Technician', password: 'password123', customerId: null },
  'client@comprepair.ph':    { role: 'customer',     name: 'Demo Client',     password: 'password123', customerId: 'CUST-005' },
};

/** Look up an account by email. Returns null if not found. */
export const lookupAccount = (email) =>
  REGISTRY[email.trim().toLowerCase()] ?? null;

/**
 * Register a new client login account.
 * Called by DataContext.registerCustomer() right after the customer record is created.
 *
 * @param {string} loginEmail  - The email the client will use to log in
 * @param {string} name        - Client's display name
 * @param {string} password    - Temporary password (staff will share this with the client)
 * @param {string} customerId  - The CUST-XXX id from DataContext
 */
export const registerClientAccount = (loginEmail, name, password, customerId) => {
  const key = loginEmail.trim().toLowerCase();
  REGISTRY[key] = { role: 'customer', name, password, customerId };
};

/** Check if a login email is already taken. */
export const isEmailTaken = (email) =>
  Object.prototype.hasOwnProperty.call(REGISTRY, email.trim().toLowerCase());

/** Auto-generate a system login email from a client's name.
 *  e.g. "Juan dela Cruz" → "juan.delacruz@comprepair.ph"
 */
export const suggestLoginEmail = (fullName) => {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')     // remove non-alpha
    .split(/\s+/)
    .join('.');
  return `${slug}@comprepair.ph`;
};

/** Auto-generate a temporary password from a client's name.
 *  e.g. "Juan dela Cruz" → "Juan@CR2026"
 *  Staff will share this with the client on registration.
 */
export const generateTempPassword = (fullName) => {
  const first = fullName.trim().split(/\s+/)[0];
  const cap   = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  const year  = new Date().getFullYear();
  return `${cap}@CR${year}`;
};
