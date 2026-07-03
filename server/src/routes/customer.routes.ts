import { Router } from 'express';
import * as customerController from '../controllers/customer.controller';
import { optionalAuth } from '../middleware/auth.middleware';
import {
    getPackages,
    recharge,
    getMyRecharges,
    getActiveRecharge,
    getUserBalance,
    payForRecharge,
    getMyBalanceTransactions,
} from '../controllers/recharge.controller';
import * as paymentController from '../controllers/payment.controller';
import { getActiveBanners } from '../controllers/adBanner.controller';

const router = Router();

// Public Auth (no authentication required)
router.post('/customers/login', customerController.customerLogin);
router.post('/customers/register', customerController.customerRegister);
router.post('/customers/wechat-login', customerController.wechatLogin);

// WeChat OAuth: exchange code for openId
router.post('/wechat/openid', customerController.getWechatOpenId);

// Public: Banner ads
router.get('/banners', getActiveBanners);

// Public: Get available products and categories
router.get('/products', customerController.getProducts);
router.get('/categories', (_req, res) => {
    const { categoryModel } = require('../models/category.model');
    const { success } = require('../utils/response');
    success(res, categoryModel.findAll(true));
});

// Public: 省市区树（收货地址级联选择）
router.get('/regions/tree', customerController.getRegionTree);

// Recharge - public (get packages list)
router.get('/customers/recharge/packages', getPackages);

// Payment callback (no auth needed)
router.post('/payment/notify', paymentController.paymentNotify);

// Customer Profile (optional auth - works with or without token)
router.use(optionalAuth);

// Create order (supports both online and balance payment)
router.post('/orders', customerController.createOrder);
router.get('/orders/:id', customerController.getOrderById);
router.get('/my-orders', customerController.getMyOrders);

// Payment
router.post('/orders/:id/pay', customerController.payForOrder);
router.post('/payment/create', paymentController.createPayment);
router.post('/payment/recharge/create', paymentController.createRechargePayment);

// Password change
router.put('/customers/password', customerController.changePassword);

// Recharge - protected (need login)
router.post('/customers/recharge', recharge);
router.post('/customers/recharge/:id/pay', payForRecharge);
router.get('/customers/recharge/my-recharges', getMyRecharges);
router.get('/customers/recharge/active', getActiveRecharge);
router.get('/customers/recharge/balance', getUserBalance);
router.get('/customers/recharge/transactions', getMyBalanceTransactions);

// Address management
router.get('/addresses', customerController.getAddresses);
router.post('/addresses', customerController.addAddress);
router.put('/addresses/:id', customerController.updateAddress);
router.delete('/addresses/:id', customerController.deleteAddress);

// Points management
router.get('/customers/points', customerController.getMyPoints);
router.get('/customers/points/records', customerController.getMyPointsRecords);
router.post('/customers/points/use', customerController.usePoints);

export default router;
