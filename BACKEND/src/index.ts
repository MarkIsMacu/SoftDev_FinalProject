import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import customerRoutes from './routes/customers.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(helmet());

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`CompRepair API running on http://localhost:${PORT}`);
  console.log(`Environment : ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Client URL  : ${process.env.CLIENT_URL ?? 'http://localhost:5173'}`);
});

export default app;