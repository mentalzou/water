import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import config from './config';

import adminRoutes from './routes/admin.routes';
import customerRoutes from './routes/customer.routes';
import distributorRoutes from './routes/distributor.routes';
import deliverymanRoutes from './routes/deliveryman.routes';
import paymentRoutes from './routes/payment.routes';

// Public route controllers (must be imported before protected routers)
import * as deliverymanController from './controllers/deliveryman.controller';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // 允许 localhost、局域网 IP、以及微信 web-view（origin 为 null）
    if (!origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(null, true); // 开发阶段全部放行
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(config.upload.baseDir));

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
