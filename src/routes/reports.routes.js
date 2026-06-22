import express from 'express';
import reportController from '../controllers/report.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce authentication on all report endpoints
router.use(authMiddleware);

router.post('/', reportController.submitReport);
router.get('/', reportController.getMyReports);

export default router;
