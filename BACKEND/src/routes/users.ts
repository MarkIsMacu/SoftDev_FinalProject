import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticate);

// GET all users (admin) or technicians (staff/tech)
router.get(
  '/',
  authorize('admin', 'receptionist', 'technician'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const roleFilter = req.query.role as string | undefined;

    try {
      if (roleFilter === 'technician') {
        const technicians = await prisma.technician.findMany({ orderBy: { name: 'asc' } });
        res.status(200).json(technicians.map((t) => ({ id: t.id, name: t.name, email: t.email })));
        return;
      }

      if (req.user!.role !== 'admin') {
        res.status(403).json({ message: 'Forbidden.' });
        return;
      }

      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      res.status(200).json(users);
    } catch (err) {
      console.error('[users/GET]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

// PATCH /users/:id — admin edits a user (name, email, role, optional password)
router.patch(
  '/:id',
  authorize('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (!name && !email && !role && !password) {
      res.status(400).json({ message: 'Nothing to update.' });
      return;
    }

    try {
      const updateData: Record<string, any> = {};
      if (name)     updateData.name  = name.trim();
      if (email)    updateData.email = email.trim().toLowerCase();
      if (role)     updateData.role  = role;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      res.status(200).json(updated);
    } catch (err: any) {
      if (err.code === 'P2025') { res.status(404).json({ message: 'User not found.' }); return; }
      console.error('[users/PATCH]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

// DELETE /users/:id — admin deletes a user
router.delete(
  '/:id',
  authorize('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    if (id === req.user!.id) {
      res.status(400).json({ message: 'You cannot delete your own account.' });
      return;
    }

    try {
      await prisma.user.delete({ where: { id } });
      res.status(200).json({ message: 'User deleted.' });
    } catch (err: any) {
      if (err.code === 'P2025') { res.status(404).json({ message: 'User not found.' }); return; }
      console.error('[users/DELETE]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;