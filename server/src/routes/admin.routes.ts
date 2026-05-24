import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

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

// Areas CRUD
router.get('/areas', adminController.listAreas);
router.post('/areas', adminController.createArea);
router.put('/areas/:id', adminController.updateArea);
router.delete('/areas/:id', adminController.deleteArea);

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

// Orders management
router.get('/orders', adminController.listAllOrders);

// System config
router.get('/configs', adminController.getConfigs);
router.put('/configs', adminController.updateConfig);

export default router;
