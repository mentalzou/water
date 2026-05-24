import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as deliverymanController from '../controllers/deliveryman.controller';

const router = Router();

// All routes below require authentication
router.use(authMiddleware);

// Task management
router.get('/deliverymen/:id/tasks', deliverymanController.getTaskList);
router.get('/tasks/:id', deliverymanController.getTaskDetail);
router.post('/tasks/:id/accept', deliverymanController.acceptTask);
router.post('/tasks/:id/complete', deliverymanController.completeTask);

export default router;
