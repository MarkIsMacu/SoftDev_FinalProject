/**
 * prisma/seed.js
 * Seeds the comprepair database with demo data matching
 * the frontend's DataContext.jsx and accounts.js exactly.
 *
 * Run with:
 *   node prisma/seed.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Hash helper ────────────────────────────────────────────────────────
  const hash = (pw) => bcrypt.hash(pw, 10);

  // ── 2. Users ──────────────────────────────────────────────────────────────
  console.log('  → Creating users...');

  const adminUser = await prisma.user.upsert({
    where:  { email: 'admin@comprepair.ph' },
    update: {},
    create: {
      name:     'Admin User',
      email:    'admin@comprepair.ph',
      password: await hash('password123'),
      role:     'admin',
    },
  });

  const receptionUser = await prisma.user.upsert({
    where:  { email: 'reception@comprepair.ph' },
    update: {},
    create: {
      name:     'Reception Staff',
      email:    'reception@comprepair.ph',
      password: await hash('password123'),
      role:     'receptionist',
    },
  });

  const techUser = await prisma.user.upsert({
    where:  { email: 'tech@comprepair.ph' },
    update: {},
    create: {
      name:     'Lead Technician',
      email:    'tech@comprepair.ph',
      password: await hash('password123'),
      role:     'technician',
    },
  });

  const clientUser = await prisma.user.upsert({
    where:  { email: 'client@comprepair.ph' },
    update: {},
    create: {
      name:     'Demo Client',
      email:    'client@comprepair.ph',
      password: await hash('password123'),
      role:     'customer',
    },
  });

  // ── 3. Technician profile ─────────────────────────────────────────────────
  console.log('  → Creating technician profile...');

  const technician = await prisma.technician.upsert({
    where:  { email: 'tech@comprepair.ph' },
    update: {},
    create: {
      name:  'Lead Technician',
      email: 'tech@comprepair.ph',
    },
  });

  // ── 4. Customers ──────────────────────────────────────────────────────────
  console.log('  → Creating customers...');

  // Helper: find or create a customer by their contact email
  const findOrCreateCustomer = async (data) => {
    const existing = await prisma.customer.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      console.log(`    ⏭  Customer ${data.name} already exists, skipping.`);
      return existing;
    }
    const created = await prisma.customer.create({ data });
    console.log(`    ✅ Created customer ${data.name}`);
    return created;
  };

  const cust1 = await findOrCreateCustomer({
    name:      'John Doe',
    phone:     '+63 912 345 6789',
    email:     'john.doe@email.com',
    notes:     'Preferred contact via phone.',
    createdAt: new Date('2025-11-12'),
  });

  const cust2 = await findOrCreateCustomer({
    name:      'Alice Smith',
    phone:     '+63 998 765 4321',
    email:     'alice.s@email.com',
    notes:     '',
    createdAt: new Date('2026-01-08'),
  });

  const cust3 = await findOrCreateCustomer({
    name:      'Bob Johnson',
    phone:     '+63 917 111 2222',
    email:     'b.johnson@email.com',
    notes:     'VIP client — priority handling.',
    createdAt: new Date('2024-07-23'),
  });

  const cust4 = await findOrCreateCustomer({
    name:      'Charlie Brown',
    phone:     '+63 922 333 4444',
    email:     'charlie.b@email.com',
    notes:     '',
    createdAt: new Date('2025-09-30'),
  });

  // Diana Prince — linked to the client@comprepair.ph login account
  const cust5 = await findOrCreateCustomer({
    name:      'Diana Prince',
    phone:     '+63 933 444 5555',
    email:     'diana.p@email.com',
    notes:     '',
    createdAt: new Date('2026-04-19'),
    userId:    clientUser.id,
  });

  // ── 5. Tickets ────────────────────────────────────────────────────────────
  console.log('  → Creating tickets...');

  const ticketDefs = [
    {
      ticketCode:  'RT-1042',
      customerId:  cust1.id,
      techId:      technician.id,
      createdById: receptionUser.id,
      device:      'MacBook Pro 16" M1',
      issue:       'Battery degradation',
      status:      'Completed',
      date:        new Date('2026-05-10'),
      clientNote:  'Battery dying within 2 hours of full charge.',
      findings:    'Battery health at 62%. Replaced with OEM battery unit. Charge cycle tested and confirmed nominal.',
      privateNote: 'Warranty expired. Full cost charged.',
      parts: [
        'Apple OEM Battery 100Wh (A2166)',
      ],
      log: [
        { action: 'Ticket created',       userId: receptionUser.id, createdAt: new Date('2026-05-10T09:00:00') },
        { action: 'Status → In Progress', userId: techUser.id,      createdAt: new Date('2026-05-10T10:15:00') },
        { action: 'Status → Completed',   userId: techUser.id,      createdAt: new Date('2026-05-10T14:30:00') },
      ],
    },
    {
      ticketCode:  'RT-1043',
      customerId:  cust2.id,
      techId:      technician.id,
      createdById: adminUser.id,
      device:      'Dell XPS 13 9310',
      issue:       'Display artifacting',
      status:      'In_Progress',
      date:        new Date('2026-05-11'),
      clientNote:  'Screen flickers intensely when opening the lid past 90°. Intermittent vertical lines appear on the left side.',
      findings:    'Opened chassis and inspected eDP display cable. Cable is crimped near the hinge. Re-seated connector — issue persists. Requires full cable assembly replacement.',
      privateNote: '',
      parts: [
        'Dell eDP Cable 30-pin (P/N: DC020024S00)',
      ],
      log: [
        { action: 'Ticket created',       userId: adminUser.id, createdAt: new Date('2026-05-11T08:30:00') },
        { action: 'Status → In Progress', userId: techUser.id,  createdAt: new Date('2026-05-11T11:00:00') },
      ],
    },
    {
      ticketCode:  'RT-1044',
      customerId:  cust3.id,
      techId:      technician.id,
      createdById: receptionUser.id,
      device:      'Lenovo ThinkPad X1',
      issue:       'Keyboard matrix failure',
      status:      'Awaiting_Parts',
      date:        new Date('2026-05-11'),
      clientNote:  'Several keys on the right side of the keyboard stopped working after a spill. Keys: K, L, O, P, semicolon.',
      findings:    'Keyboard matrix scan confirmed failure on column 7. Liquid corrosion visible on the ribbon connector. Full keyboard assembly replacement required.',
      privateNote: 'Parts ordered from supplier. ETA: 2-3 days.',
      parts: [
        'Lenovo ThinkPad X1 Carbon Keyboard Assy (P/N: 01YP040)',
        'Ribbon Cable 40-pin FFC',
      ],
      log: [
        { action: 'Ticket created',          userId: receptionUser.id, createdAt: new Date('2026-05-11T09:45:00') },
        { action: 'Status → In Progress',    userId: techUser.id,      createdAt: new Date('2026-05-11T13:00:00') },
        { action: 'Status → Awaiting Parts', userId: techUser.id,      createdAt: new Date('2026-05-11T15:20:00') },
      ],
    },
    {
      ticketCode:  'RT-1045',
      customerId:  cust4.id,
      techId:      technician.id,
      createdById: receptionUser.id,
      device:      'Custom ATX Build',
      issue:       'Thermal throttling',
      status:      'Received',
      date:        new Date('2026-05-12'),
      clientNote:  'PC slows down heavily during gaming. CPU usage drops to 0% for brief moments. Temps seem fine according to HWMonitor.',
      findings:    'Initial inspection pending. Unit received and logged.',
      privateNote: '',
      parts: [],
      log: [
        { action: 'Ticket created', userId: receptionUser.id, createdAt: new Date('2026-05-12T10:00:00') },
      ],
    },
    {
      ticketCode:  'RT-1046',
      customerId:  cust5.id,
      techId:      technician.id,
      createdById: adminUser.id,
      device:      'HP Spectre x360',
      issue:       'Power delivery fault',
      status:      'In_Progress',
      date:        new Date('2026-05-12'),
      clientNote:  'Laptop charges intermittently. Sometimes shows "plugged in, not charging." Tried multiple chargers — same result.',
      findings:    'Charging board tested — output voltage inconsistent. Likely failed charging IC or damaged charging port. Further investigation needed.',
      privateNote: '',
      parts: [],
      log: [
        { action: 'Ticket created',       userId: adminUser.id, createdAt: new Date('2026-05-12T09:15:00') },
        { action: 'Status → In Progress', userId: techUser.id,  createdAt: new Date('2026-05-12T11:30:00') },
      ],
    },
  ];

  for (const t of ticketDefs) {
    const existing = await prisma.ticket.findUnique({
      where: { ticketCode: t.ticketCode },
    });

    if (existing) {
      console.log(`    ⏭  Ticket ${t.ticketCode} already exists, skipping.`);
      continue;
    }

    await prisma.ticket.create({
      data: {
        ticketCode:   t.ticketCode,
        status:       t.status,
        device:       t.device,
        issue:        t.issue,
        clientNote:   t.clientNote,
        findings:     t.findings,
        privateNote:  t.privateNote,
        date:         t.date,
        createdAt:    t.date,
        customerId:   t.customerId,
        technicianId: t.techId,
        createdById:  t.createdById,
        parts: {
          create: t.parts.map((p) => ({ description: p })),
        },
        activityLogs: {
          create: t.log.map((l) => ({
            action:    l.action,
            createdAt: l.createdAt,
            userId:    l.userId,
          })),
        },
      },
    });

    console.log(`    ✅ Created ticket ${t.ticketCode}`);
  }

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo login credentials:');
  console.log('  admin@comprepair.ph       / password123  (Admin)');
  console.log('  reception@comprepair.ph   / password123  (Receptionist)');
  console.log('  tech@comprepair.ph        / password123  (Technician)');
  console.log('  client@comprepair.ph      / password123  (Customer — Diana Prince)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });