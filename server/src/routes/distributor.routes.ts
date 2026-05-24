import { Router } from 'express';
import * as distributorController from '../controllers/distributor.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Distributor Login - 不需要认证
router.post('/distributors/login', distributorController.distributorLogin);

// 公开接口：获取分销商信息（用于分享链接等场景，不需要登录）
router.get('/distributors/public/:code', distributorController.getDistributorInfo);

// 公开接口：获取分享链接（不需要登录）
router.get('/distributors/:id/share', distributorController.getShareLink);

// 以下路由需要认证
router.use(authMiddleware);

// Get distributor info
router.get('/distributors/:code', distributorController.getDistributorInfo);

// Commission summary
router.get('/distributors/:id/commission/summary', distributorController.getCommissionSummary);
router.get('/distributors/:id/commissions', distributorController.getCommissionRecords);

export default router;
