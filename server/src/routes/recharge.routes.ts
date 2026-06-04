import express from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import * as customerController from '../controllers/customer.controller';
import {
    getPackages,
    recharge,
    getMyRecharges,
    getActiveRecharge,
    getUserBalance,
    payForRecharge,
} from '../controllers/recharge.controller';

const router = express.Router();

router.post('/login', customerController.customerLogin);
router.post('/register', customerController.customerRegister);

// 需要认证的路由
router.use(optionalAuth);

router.put('/password', customerController.changePassword);

// 地址管理
router.get('/addresses', customerController.getAddresses);
router.post('/addresses', customerController.addAddress);
router.put('/addresses/:id', customerController.updateAddress);
router.delete('/addresses/:id', customerController.deleteAddress);

// 积分管理
router.get('/points', customerController.getMyPoints);
router.get('/points/records', customerController.getMyPointsRecords);
router.post('/points/use', customerController.usePoints);

// 充值相关
router.get('/recharge/packages', getPackages);
router.post('/recharge', recharge);
router.get('/recharge/my-recharges', getMyRecharges);
router.get('/recharge/active', getActiveRecharge);
router.get('/recharge/balance', getUserBalance);

// 商品和订单
router.get('/products', customerController.getProducts);
router.post('/orders', customerController.createOrder);
router.get('/orders/:id', customerController.getOrderById);
router.get('/my-orders', customerController.getMyOrders);
router.post('/orders/:id/pay', customerController.payForOrder);

export default router;
