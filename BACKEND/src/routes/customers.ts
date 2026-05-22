import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const toDisplay = (s: string) =>
  s.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts');

router.get(
  '/',
  authorize('admin', 'receptionist'),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
          tickets: { select: { id: true, status: true } },
        },
      });

      const shaped = customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        joined: c.createdAt.toISOString().split('T')[0],
        accountEmail: c.user?.email ?? null,
        activeRepairs: c.tickets.filter((t) => t.status !== 'Completed').length,
        totalRepairs: c.tickets.length,
      }));

      res.status(200).json(shaped);
    } catch (err) {
      console.error('[customers/GET]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.get(
  '/:id',
  authorize('admin', 'receptionist'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          user: { select: { email: true } },
          tickets: { select: { id: true, status: true } },
        },
      });

      if (!customer) {
        res.status(404).json({ message: 'Customer not found.' });
        return;
      }

      res.status(200).json({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        notes: customer.notes,
        joined: customer.createdAt.toISOString().split('T')[0],
        accountEmail: customer.user?.email ?? null,
        activeRepairs: customer.tickets.filter((t) => t.status !== 'Completed').length,
        totalRepairs: customer.tickets.length,
      });
    } catch (err) {
      console.error('[customers/GET/:id]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.post(
  '/',
  authorize('admin', 'receptionist'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, phone, email, notes, loginEmail, tempPassword } = req.body;

    if (!name?.trim()) { res.status(400).json({ message: 'Name is required.' }); return; }
    if (!phone?.trim()) { res.status(400).json({ message: 'Phone is required.' }); return; }
    if (!email?.trim()) { res.status(400).json({ message: 'Contact email is required.' }); return; }
    if (!loginEmail?.trim()) { res.status(400).json({ message: 'Login email is required.' }); return; }
    if (!tempPassword?.trim()) { res.status(400).json({ message: 'Temporary password is required.' }); return; }
    if (tempPassword.trim().length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: loginEmail.trim().toLowerCase() },
      });
      if (existingUser) {
        res.status(409).json({ message: `"${loginEmail}" is already taken. Try another login email.` });
        return;
      }

      const hashedPassword = await bcrypt.hash(tempPassword.trim(), 10);

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: name.trim(),
            email: loginEmail.trim().toLowerCase(),
            password: hashedPassword,
            role: 'customer',
          },
        });

        const customer = await tx.customer.create({
          data: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            notes: notes?.trim() ?? '',
            userId: user.id,
          },
        });

        return { user, customer };
      });

      res.status(201).json({
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        email: result.customer.email,
        notes: result.customer.notes,
        joined: result.customer.createdAt.toISOString().split('T')[0],
        accountEmail: result.user.email,
        activeRepairs: 0,
        totalRepairs: 0,
        credentials: {
          loginEmail: result.user.email,
          tempPassword: tempPassword.trim(),
        },
      });
    } catch (err) {
      console.error('[customers/POST]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.get(
  '/:id/history',
  authorize('admin', 'receptionist'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const customerId = req.params.id as string;

      const tickets = await prisma.ticket.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: {
          parts: { select: { description: true } },
          activityLogs: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true } } },
          },
        },
      });

      const shaped = tickets.map((t) => ({
        id: t.id,
        ticketCode: t.ticketCode,
        status: toDisplay(t.status as string),
        device: t.device,
        issue: t.issue,
        clientNote: t.clientNote,
        findings: t.findings,
        date: t.date.toISOString().split('T')[0],
        parts: t.parts.map((p: { description: string }) => p.description),
        activityLog: t.activityLogs.map((l: { action: string; user: { name: string } | null; createdAt: Date }) => ({
          action: l.action,
          by: l.user?.name ?? 'System',
          time: l.createdAt.toISOString().replace('T', ' ').slice(0, 16),
        })),
      }));

      res.status(200).json(shaped);
    } catch (err) {
      console.error('[customers/GET/:id/history]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.delete(
  '/:id',
  authorize('admin', 'receptionist'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;

    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!customer) {
        res.status(404).json({ message: 'Customer not found.' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // 1. Find all tickets belonging to this Customer
        const tickets = await tx.ticket.findMany({
          where: { customerId: id },
          select: { id: true },
        });
        const ticketIds = tickets.map((t) => t.id);

        if (ticketIds.length > 0) {
          // 2. Delete dependent ticket child records
          await tx.ticketPart.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.activityLog.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          await tx.ticketMessage.deleteMany({
            where: { ticketId: { in: ticketIds } },
          });
          // 3. Delete the tickets themselves
          await tx.ticket.deleteMany({
            where: { id: { in: ticketIds } },
          });
        }

        // 4. Delete the Customer profile record
        await tx.customer.delete({
          where: { id },
        });

        // 5. Delete the associated User login account if it exists
        if (customer.userId) {
          await tx.user.delete({
            where: { id: customer.userId },
          });
        }
      });

      res.status(200).json({ message: 'Customer and all associated data deleted successfully.' });
    } catch (err: any) {
      if (err.code === 'P2025') { res.status(404).json({ message: 'Customer not found.' }); return; }
      console.error('[customers/DELETE]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;