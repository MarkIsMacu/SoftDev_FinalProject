/**
 * prisma/cleanup.js
 * Removes seeded fake customers (John Doe, Alice Smith, Bob Johnson,
 * Charlie Brown, Diana Prince) and all their tickets.
 * Keeps all User accounts intact.
 *
 * Run with:  node prisma/cleanup.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

const FAKE_CUSTOMER_NAMES = [
  'John Doe',
  'Alice Smith',
  'Bob Johnson',
  'Charlie Brown',
  'Diana Prince',
];

async function cleanup() {
  console.log('🔍 Scanning database...\n');

  // Find all seeded fake customers
  const fakeCustomers = await prisma.customer.findMany({
    where: { name: { in: FAKE_CUSTOMER_NAMES } },
    include: { tickets: { select: { id: true, ticketCode: true } } },
  });

  if (fakeCustomers.length === 0) {
    console.log('✅ No fake seed customers found — database is already clean!');
    return;
  }

  console.log(`Found ${fakeCustomers.length} fake customer(s) to remove:`);
  fakeCustomers.forEach(c => {
    const tCodes = c.tickets.map(t => t.ticketCode).join(', ') || 'none';
    console.log(`  - ${c.name} | tickets: ${tCodes}`);
  });

  const customerIds = fakeCustomers.map(c => c.id);
  const ticketIds   = fakeCustomers.flatMap(c => c.tickets.map(t => t.id));

  // Step 1: Delete activity logs for those tickets
  const logs = await prisma.activityLog.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`\n✅ Deleted ${logs.count} activity log(s)`);

  // Step 2: Delete ticket parts for those tickets
  const parts = await prisma.ticketPart.deleteMany({
    where: { ticketId: { in: ticketIds } },
  });
  console.log(`✅ Deleted ${parts.count} ticket part(s)`);

  // Step 3: Delete the tickets themselves
  const tickets = await prisma.ticket.deleteMany({
    where: { id: { in: ticketIds } },
  });
  console.log(`✅ Deleted ${tickets.count} ticket(s)`);

  // Step 4: Delete the customer profiles
  // (userId link uses onDelete: SetNull so the User accounts stay)
  const customers = await prisma.customer.deleteMany({
    where: { id: { in: customerIds } },
  });
  console.log(`✅ Deleted ${customers.count} customer profile(s)`);

  // ── Final state ──────────────────────────────────────────────────────────────
  console.log('\n📊 Final database state:');

  const users     = await prisma.user.findMany({ select: { name: true, email: true, role: true } });
  const custLeft  = await prisma.customer.findMany({ select: { name: true, email: true } });
  const tickLeft  = await prisma.ticket.findMany({ select: { ticketCode: true, status: true } });

  console.log(`\n👤 Users (${users.length}):`);
  users.forEach(u => console.log(`   - ${u.name} <${u.email}> [${u.role}]`));

  console.log(`\n👥 Customer profiles (${custLeft.length}):`);
  custLeft.length
    ? custLeft.forEach(c => console.log(`   - ${c.name} <${c.email}>`))
    : console.log('   (none)');

  console.log(`\n🎫 Tickets (${tickLeft.length}):`);
  tickLeft.length
    ? tickLeft.forEach(t => console.log(`   - ${t.ticketCode} [${t.status}]`))
    : console.log('   (none)');

  console.log('\n🎉 Cleanup complete!');
}

cleanup()
  .catch(err => {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
