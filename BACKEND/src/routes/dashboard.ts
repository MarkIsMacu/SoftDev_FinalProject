import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      inProgress,
      awaitingParts,
      completed,
      received,
      totalTickets,
      totalClients,
    ] = await Promise.all([
      prisma.ticket.count({ where: { status: 'In_Progress' } }),
      prisma.ticket.count({ where: { status: 'Awaiting_Parts' } }),
      prisma.ticket.count({ where: { status: 'Completed' } }),
      prisma.ticket.count({ where: { status: 'Received' } }),
      prisma.ticket.count(),
      prisma.customer.count(),
    ]);

    res.status(200).json({
      inProgress,
      awaitingParts,
      completed,
      received,
      totalTickets,
      totalClients,
    });
  } catch (err) {
    console.error('[dashboard/stats]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/activity', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true } },
        ticket: { select: { ticketCode: true, device: true } },
      },
    });

    const shaped = logs.map((l) => ({
      id: l.id,
      action: l.action,
      by: l.user?.name ?? 'System',
      ticketId: l.ticket.ticketCode,
      device: l.ticket.device,
      time: l.createdAt.toISOString().replace('T', ' ').slice(0, 16),
    }));

    res.status(200).json(shaped);
  } catch (err) {
    console.error('[dashboard/activity]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

export default router;