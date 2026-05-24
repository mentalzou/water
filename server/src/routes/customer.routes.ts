import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Public Auth (no authentication required)
router.post('/customers/login', customerController.customerLogin);
router.post('/customers/register', customerController.customerRegister);

// Public: Get available products
router.get('/products', customerController.getProducts);

// Create order
router.post('/orders', customerController.createOrder);
router.get('/orders/:id', customerController.getOrderById);
router.get('/my-orders', customerController.getMyOrders);

// Payment (mock)
router.post('/orders/:id/pay', customerController.payForOrder);

// Customer Profile (optional auth - works with or without token)
router.use(optionalAuth);

// Password change
router.put('/customers/password', customerController.changePassword);

// Address management
router.get('/addresses', customerController.getAddresses);
router.post('/addresses', customerController.addAddress);
router.put('/addresses/:id', customerController.updateAddress);
router.delete('/addresses/:id', customerController.deleteAddress);

export default router;
