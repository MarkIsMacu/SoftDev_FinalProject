const REGISTRY = {
  'admin@comprepair.ph': { role: 'admin', name: 'Admin User', password: 'password123', customerId: null },
  'reception@comprepair.ph': { role: 'receptionist', name: 'Reception Staff', password: 'password123', customerId: null },
  'tech@comprepair.ph': { role: 'technician', name: 'Lead Technician', password: 'password123', customerId: null },
  'client@comprepair.ph': { role: 'customer', name: 'Demo Client', password: 'password123', customerId: 'CUST-005' },
};

export const lookupAccount = (email) =>
  REGISTRY[email.trim().toLowerCase()] ?? null;

/**
 *
 * @param {string} loginEmail
 * @param {string} name
 * @param {string} password
 * @param {string} customerId
 */
export const registerClientAccount = (loginEmail, name, password, customerId) => {
  const key = loginEmail.trim().toLowerCase();
  REGISTRY[key] = { role: 'customer', name, password, customerId };
};

export const isEmailTaken = (email) =>
  Object.prototype.hasOwnProperty.call(REGISTRY, email.trim().toLowerCase());

export const suggestLoginEmail = (fullName) => {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .join('.');
  return `${slug}@comprepair.ph`;
};

export const generateTempPassword = (fullName) => {
  const first = fullName.trim().split(/\s+/)[0];
  const cap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  const year = new Date().getFullYear();
  return `${cap}@CR${year}`;
};
