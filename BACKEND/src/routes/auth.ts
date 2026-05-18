import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import type { SignOptions } from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const rawExpires = process.env.JWT_EXPIRES_IN ?? '8h';

const JWT_EXPIRES: SignOptions['expiresIn'] =
  rawExpires as SignOptions['expiresIn'];

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { customer: { select: { id: true } } },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ message: 'Invalid email or password.' });
      return;
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id ?? null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    res.status(200).json({
      token,
      user: payload,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        customer: { select: { id: true } },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerId: user.customer?.id ?? null,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/logout', authenticate, (_req: AuthRequest, res: Response): void => {
  res.status(200).json({ message: 'Logged out successfully.' });
});

export default router;