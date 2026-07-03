import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';
import * as adBannerController from '../controllers/adBanner.controller';

const router = Router();

// Login - 不需要认证
router.post('/login', adminController.adminLogin);

// 以下所有路由需要认证
router.use(authMiddleware);

// 当前用户信息（含权限）
router.get('/profile', adminController.getProfile);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserDetail);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/reset-password', adminController.resetUserPassword);

// User Points Management
router.get('/users/:id/points', adminController.getUserPoints);
router.post('/users/:id/points/adjust', adminController.adjustUserPoints);
router.get('/users/:id/points/records', adminController.getUserPointsHistory);

// Role Management
router.get('/roles', adminController.listRoles);
router.post('/roles', adminController.createRole);
router.put('/roles/:id', adminController.updateRole);
router.delete('/roles/:id', adminController.deleteRole);

// Distributors CRUD
router.get('/distributors', adminController.listDistributors);
router.post('/distributors', adminController.createDistributor);
router.put('/distributors/:id/reset-password', adminController.resetDistributorPassword);
router.put('/distributors/:id', adminController.updateDistributor);
router.delete('/distributors/:id', adminController.deleteDistributor);

// Deliverymen CRUD — reset-password 必须在 :id 之前！
router.get('/deliverymen', adminController.listDeliverymen);
router.post('/deliverymen', adminController.createDeliveryman);
router.put('/deliverymen/:id/reset-password', adminController.resetDeliverymanPassword);
router.put('/deliverymen/:id', adminController.updateDeliveryman);
router.delete('/deliverymen/:id', adminController.deleteDeliveryman);

// Areas CRUD（旧配送区域，保留兼容）
router.get('/areas', adminController.listAreas);
router.post('/areas', adminController.createArea);
router.put('/areas/:id', adminController.updateArea);
router.delete('/areas/:id', adminController.deleteArea);

// Regions (省市区管理)
router.get('/regions', adminController.listRegions);
router.get('/regions/flat', adminController.listRegionsFlat);
router.post('/regions', adminController.createRegion);
router.put('/regions/:id', adminController.updateRegion);
router.delete('/regions/:id', adminController.deleteRegion);

// Categories CRUD
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.get('/categories/select', adminController.listCategoriesForSelect);

// Brands CRUD
router.get('/brands', adminController.listBrands);
router.post('/brands', adminController.createBrand);
router.put('/brands/:id', adminController.updateBrand);
router.delete('/brands/:id', adminController.deleteBrand);
router.get('/brands/select', adminController.listBrandsForSelect);

// Products CRUD
router.get('/products', adminController.listProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/upload', adminController.productUpload.single('file'), adminController.uploadProductImage);

// Orders management
router.get('/orders/export', adminController.exportOrders);
router.get('/orders', adminController.listAllOrders);
router.post('/orders/:id/query-payment', adminController.queryOrderPayment);
router.post('/orders/:id/refund', adminController.refundOrder);
router.post('/orders/:id/query-refund', adminController.queryRefundOrder);
router.post('/orders/:id/assign-deliveryman', adminController.assignOrderDeliveryman);
router.post('/orders/:id/close', adminController.closeOrder);

// Helipay terminal info
router.get('/helipay/terminal', adminController.getHelipayTerminalInfo);
router.delete('/helipay/terminal', adminController.deleteHelipayTerminal);

// System config
router.get('/configs', adminController.getConfigs);
router.put('/configs', adminController.updateConfig);

// Recharge Packages Management
router.get('/recharge/packages', adminController.listRechargePackages);
router.post('/recharge/packages', adminController.createRechargePackage);
router.put('/recharge/packages/:id', adminController.updateRechargePackage);
router.put('/recharge/packages/:id/status', adminController.updateRechargePackageStatus);
router.delete('/recharge/packages/:id', adminController.deleteRechargePackage);

// User Recharge Balance
router.get('/users/:id/recharge-balance', adminController.getUserRechargeBalance);

// Recharge Orders & Reports
router.get('/recharge/orders', adminController.listRechargeOrders);
router.post('/recharge/orders/:id/query-payment', adminController.queryRechargePayment);
router.post('/recharge/orders/:id/refund', adminController.refundRecharge);
router.post('/recharge/orders/:id/query-refund', adminController.queryRechargeRefund);
router.get('/recharge/stats', adminController.getRechargeStats);
router.get('/recharge/transactions', adminController.listBalanceTransactions);

// Commission Management
router.get('/commissions/export', adminController.exportCommissions);
router.get('/commissions/stats', adminController.commissionStats);
router.get('/commissions/payout/export', adminController.exportPayoutRecord);
router.post('/commissions/payout/import', adminController.importPayoutRecord);
router.get('/commissions', adminController.listCommissions);

// Ad Banners Management
router.get('/banners', adBannerController.listBanners);
router.post('/banners/upload', adBannerController.upload.single('file'), adBannerController.uploadFile);
router.post('/banners', adBannerController.createBanner);
router.put('/banners/:id', adBannerController.updateBanner);
router.delete('/banners/:id', adBannerController.deleteBanner);

// 提现管理暂屏蔽
// router.get('/withdraws', adminController.listWithdraws);
// router.put('/withdraws/:id/approve', adminController.approveWithdraw);
// router.put('/withdraws/:id/reject', adminController.rejectWithdraw);
// router.put('/withdraws/:id/pay', adminController.payWithdraw);

export default router;
