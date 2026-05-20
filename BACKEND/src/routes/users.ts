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
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      const updateData: Record<string, any> = {};
      if (name)     updateData.name  = name.trim();
      if (email)    updateData.email = email.trim().toLowerCase();
      if (role)     updateData.role  = role;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      const updated = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: updateData,
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        });

        const wasTech = existingUser.role === 'technician';
        const isTech = user.role === 'technician';

        if (wasTech && !isTech) {
          // Role changed from technician to something else, remove from Technician list
          await tx.technician.deleteMany({ where: { email: existingUser.email } });
        } else if (!wasTech && isTech) {
          // Role changed to technician, create technician profile
          await tx.technician.upsert({
            where: { email: user.email },
            update: { name: user.name },
            create: { name: user.name, email: user.email },
          });
        } else if (isTech) {
          // Remained technician, sync potential name or email changes
          await tx.technician.updateMany({
            where: { email: existingUser.email },
            data: { name: user.name, email: user.email },
          });
        }

        return user;
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
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        if (existingUser.role === 'technician') {
          await tx.technician.deleteMany({ where: { email: existingUser.email } });
        }
        await tx.user.delete({ where: { id } });
      });

      res.status(200).json({ message: 'User deleted.' });
    } catch (err: any) {
      if (err.code === 'P2025') { res.status(404).json({ message: 'User not found.' }); return; }
      console.error('[users/DELETE]', err);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
);

export default router;