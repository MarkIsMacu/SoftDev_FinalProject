import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('admin', 'receptionist', 'technician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const roleFilter = req.query.role as string | undefined;

    try {
      if (roleFilter === 'technician') {
        const technicians = await prisma.technician.findMany({
          orderBy: { name: 'asc' },
        });

        res.status(200).json(
          technicians.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
          }))
        );
        return;
      }

      if (req.user!.role !== 'admin') {
        res.status(403).json({ message: 'You do not have permission to access this resource.' });
        return;
      }

      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(200).json(users);
    } catch (err) {
      console.error('[users/GET]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;