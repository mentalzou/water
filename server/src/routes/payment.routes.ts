import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import {
    getPackages,
    recharge,
    getMyRecharges,
    getActiveRecharge,
} from '../controllers/recharge.controller';
import * as paymentController from '../controllers/payment.controller';

const router = Router();

// Public Auth (no authentication required)
router.post('/customers/login', customerController.customerLogin);
router.post('/customers/register', customerController.customerRegister);

// Public: Get available products and categories
router.get('/products', customerController.getProducts);
router.get('/categories', (_req, res) => {
    const { categoryModel } = require('../models/category.model');
    const { success } = require('../utils/response');
    success(res, categoryModel.findAll(true));
});

// Create order
router.post('/orders', customerController.createOrder);
router.get('/orders/:id', customerController.getOrderById);
router.get('/my-orders', customerController.getMyOrders);

// Payment
router.post('/orders/:id/pay', customerController.payForOrder);
router.post('/payment/create', paymentController.createPayment);
// WeChat callback
router.post('/payment/notify', paymentController.paymentNotify);

// Query payment status
// router.get('/payment/:id', paymentController.queryPayment);

export default router;
