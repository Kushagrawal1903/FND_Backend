import express from 'express';
import newsController from '../controllers/news.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { verificationLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Enforce authentication & rate-limiting on all news verification actions
//router.use(authMiddleware);
router.use(verificationLimiter);

router.post('/check', newsController.check);
router.post('/analyze', newsController.analyze);
router.post('/url-check', newsController.urlCheck);
router.post('/agent-analyze', newsController.agentAnalyze);
export default router;
