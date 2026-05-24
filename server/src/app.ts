import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';

import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import distributorRoutes from './routes/distributor.routes';
import deliverymanRoutes from './routes/deliveryman.routes';
import paymentRoutes from './routes/payment.routes';

// Public route controllers (must be imported before protected routers)
import * as deliverymanController from './controllers/deliveryman.controller';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Public routes - no authentication required
app.get('/api/health', (_req, res) => {
  res.json({ code: 200, message: '服务运行正常', data: { time: new Date().toISOString() } });
});

// Deliveryman & Distributor logins must be BEFORE admin router
app.post('/api/deliverymen/login', deliverymanController.loginDeliveryman);

// Protected API Routes (order matters: admin has authMiddleware that affects subsequent /api/* routes)
app.use('/api/admin', adminRoutes);
app.use('/api', customerRoutes);
app.use('/api', distributorRoutes);
app.use('/api', deliverymanRoutes);
app.use('/api', paymentRoutes);

// Error handling
app.use(errorHandler);

export default app;
