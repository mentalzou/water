import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Create payment
router.post('/payment/create', paymentController.createPayment);

// WeChat callback
router.post('/payment/notify', paymentController.handleNotify);

// Query payment status
router.get('/payment/:id', paymentController.queryPayment);

export default router;
