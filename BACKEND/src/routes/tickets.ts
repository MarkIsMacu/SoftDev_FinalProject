import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const normaliseStatus = (s: string): string =>
  s.replace('In Progress', 'In_Progress').replace('Awaiting Parts', 'Awaiting_Parts');

const VALID_STATUSES = ['Received', 'In_Progress', 'Awaiting_Parts', 'Completed'];

const appendLog = async (ticketId: string, action: string, userId: string) => {
  await prisma.activityLog.create({
    data: { ticketId, action, userId },
  });
};

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id: userId } = req.user!;

    const where =
      role === 'customer'
        ? { customer: { userId } }
        : {};

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true, email: true } },
        parts: { select: { id: true, description: true } },
        activityLogs: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    const shaped = tickets.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      status: t.status.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts'),
      device: t.device,
      issue: t.issue,
      clientNote: t.clientNote,
      findings: t.findings,
      privateNote: role !== 'customer' ? t.privateNote : undefined,
      date: t.date,
      customerId: t.customer.id,
      customerName: t.customer.name,
      assignedTo: t.technician?.id ?? null,
      techName: t.technician?.name ?? null,
      parts: t.parts.map((p) => p.description),
      activityLog: t.activityLogs.map((l) => ({
        action: l.action,
        by: l.user?.name ?? 'System',
        time: l.createdAt.toISOString().replace('T', ' ').slice(0, 16),
      })),
    }));

    res.status(200).json(shaped);
  } catch (err) {
    console.error('[tickets/GET]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
        parts: { select: { id: true, description: true } },
        activityLogs: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    if (req.user!.role === 'customer') {
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user!.id },
      });
      if (!customer || ticket.customerId !== customer.id) {
        res.status(403).json({ message: 'Access denied.' });
        return;
      }
    }

    res.status(200).json({
      ...ticket,
      status: ticket.status.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts'),
    });
  } catch (err) {
    console.error('[tickets/GET/:id]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post(
  '/',
  authorize('admin', 'receptionist'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { customerName, customerId, device, issue, clientNote, assignedTo, status } = req.body;

    if (!device || !issue) {
      res.status(400).json({ message: 'Device and issue are required.' });
      return;
    }

    if (customerId !== undefined && customerId !== null && customerId === '') {
      res.status(400).json({ message: 'customerId must be a valid ID or omitted.' });
      return;
    }

    try {
      const count = await prisma.ticket.count();
      const ticketCode = `RT-${1042 + count + 1}`;

      const dbStatus = status ? normaliseStatus(status) : 'Received';

      const ticket = await prisma.ticket.create({
        data: {
          ticketCode,
          device,
          issue,
          clientNote: clientNote ?? '',
          status: dbStatus as any,
          customerId: customerId || undefined,
          technicianId: assignedTo || undefined,
          createdById: req.user!.id,
        },
        include: {
          customer: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
        },
      });

      await appendLog(ticket.id, 'Ticket created', req.user!.id);

      res.status(201).json({
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        status: dbStatus.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts'),
        device: ticket.device,
        issue: ticket.issue,
        clientNote: ticket.clientNote,
        findings: ticket.findings,
        date: ticket.date,
        customerId: ticket.customer?.id ?? null,
        customerName: ticket.customer?.name ?? customerName,
        assignedTo: ticket.technician?.id ?? null,
        techName: ticket.technician?.name ?? null,
        parts: [],
        activityLog: [],
      });
    } catch (err) {
      console.error('[tickets/POST]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.patch(
  '/:id/status',
  authorize('admin', 'technician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const rawStatus = req.body.status;
    const normStatus = rawStatus ? normaliseStatus(rawStatus) : null;

    if (!normStatus || !VALID_STATUSES.includes(normStatus)) {
      res.status(400).json({
        message: `Status must be one of: Received, In Progress, Awaiting Parts, Completed`,
      });
      return;
    }

    try {
      const id = req.params.id as string;

      const ticket = await prisma.ticket.update({
        where: { id },
        data: { status: normStatus as any },
      });

      await appendLog(ticket.id, `Status → ${normStatus.replace('_', ' ')}`, req.user!.id);

      res.status(200).json({
        ...ticket,
        status: normStatus.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts'),
      });
    } catch (err) {
      console.error('[tickets/PATCH/status]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.patch(
  '/:id/workdata',
  authorize('admin', 'technician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { findings, privateNote, parts, status } = req.body;
    const normStatus = status ? normaliseStatus(status) : undefined;

    if (normStatus && !VALID_STATUSES.includes(normStatus)) {
      res.status(400).json({ message: 'Invalid status value.' });
      return;
    }

    try {
      const id = req.params.id as string;

      const ticket = await prisma.ticket.update({
        where: { id },
        data: {
          ...(findings !== undefined && { findings }),
          ...(privateNote !== undefined && { privateNote }),
          ...(normStatus !== undefined && { status: normStatus as any }),
        },
      });

      if (Array.isArray(parts)) {
        await prisma.ticketPart.deleteMany({ where: { ticketId: ticket.id } });
        if (parts.length > 0) {
          await prisma.ticketPart.createMany({
            data: parts.map((description: string) => ({
              ticketId: ticket.id,
              description,
            })),
          });
        }
      }

      if (normStatus) {
        await appendLog(ticket.id, `Status → ${normStatus.replace('_', ' ')}`, req.user!.id);
      } else {
        await appendLog(ticket.id, 'Findings/notes updated', req.user!.id);
      }

      res.status(200).json({ message: 'Ticket updated successfully.' });
    } catch (err) {
      console.error('[tickets/PATCH/workdata]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

router.post(
  '/:id/notes',
  authorize('admin', 'receptionist', 'technician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { note } = req.body;

    if (!note?.trim()) {
      res.status(400).json({ message: 'Note text is required.' });
      return;
    }

    try {
      const ticketId = req.params.id as string;
      await appendLog(ticketId, note.trim(), req.user!.id);
      res.status(201).json({ message: 'Note added.' });
    } catch (err) {
      console.error('[tickets/POST/notes]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

// ── GET /tickets/:id/messages ─────────────────────────────────────────────────
router.get(
  '/:id/messages',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id as string;
    const { role, id: userId } = req.user!;

    try {
      // Customers can only view messages on their own tickets
      if (role === 'customer') {
        const customer = await prisma.customer.findUnique({ where: { userId } });
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!customer || ticket?.customerId !== customer.id) {
          res.status(403).json({ message: 'Access denied.' });
          return;
        }
      }

      const messages = await prisma.ticketMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });

      res.status(200).json(messages.map(m => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        sender: { id: m.sender.id, name: m.sender.name, role: m.sender.role },
      })));
    } catch (err) {
      console.error('[tickets/GET/messages]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

// ── POST /tickets/:id/messages ────────────────────────────────────────────────
router.post(
  '/:id/messages',
  async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id as string;
    const { id: userId, role } = req.user!;
    const { body } = req.body;

    if (!body?.trim()) {
      res.status(400).json({ message: 'Message body is required.' });
      return;
    }

    try {
      // Customers can only message on their own tickets
      if (role === 'customer') {
        const customer = await prisma.customer.findUnique({ where: { userId } });
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
        if (!customer || ticket?.customerId !== customer.id) {
          res.status(403).json({ message: 'Access denied.' });
          return;
        }
      }

      const message = await prisma.ticketMessage.create({
        data: { ticketId, senderId: userId, body: body.trim() },
        include: { sender: { select: { id: true, name: true, role: true } } },
      });

      res.status(201).json({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        sender: { id: message.sender.id, name: message.sender.name, role: message.sender.role },
      });
    } catch (err) {
      console.error('[tickets/POST/messages]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

// DELETE /tickets/:id — admin removes a ticket entirely
router.delete(
  '/:id',
  authorize('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.params.id as string;
    try {
      await prisma.ticket.delete({ where: { id } });
      res.status(200).json({ message: 'Ticket deleted.' });
    } catch (err: any) {
      if (err.code === 'P2025') { res.status(404).json({ message: 'Ticket not found.' }); return; }
      console.error('[tickets/DELETE]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;