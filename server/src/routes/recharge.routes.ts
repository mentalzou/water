import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
    login,
    register,
    getProfile,
    updateProfile,
    changePassword,
    getProducts,
    getCategories,
    createOrder,
    getOrderById,
    getMyOrders,
    payForOrder,
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getMyPoints,
    getMyPointsRecords,
    usePoints,
} from '../controllers/customer.controller';
import {
    getPackages,
    recharge,
    getMyRecharges,
    getActiveRecharge,
} from '../controllers/recharge.controller';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);

// 需要认证的路由
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

// 地址管理
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.put('/addresses/:id', updateAddress);
router.delete('/addresses/:id', deleteAddress);

// 积分管理
router.get('/points', getMyPoints);
router.get('/points/records', getMyPointsRecords);
router.post('/points/use', usePoints);

// 充值相关
router.get('/recharge/packages', getPackages);
router.post('/recharge', recharge);
router.get('/recharge/my-recharges', getMyRecharges);
router.get('/recharge/active', getActiveRecharge);

// 商品和订单
router.get('/products', getProducts);
router.get('/categories', getCategories);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderById);
router.get('/my-orders', getMyOrders);
router.post('/orders/:id/pay', payForOrder);

export default router;
