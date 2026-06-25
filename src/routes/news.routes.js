import express from 'express';
import newsController from '../controllers/news.controller.js';
import newsAnalysisController from '../modules/news-analysis/controllers/newsAnalysis.controller.js';
import { validateNewsAnalysis } from '../modules/news-analysis/validators/newsAnalysis.validator.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { verificationLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Enforce authentication & rate-limiting on all news verification actions
router.use(authMiddleware);
router.use(verificationLimiter);

router.post('/check', validateNewsAnalysis, newsAnalysisController.analyze.bind(newsAnalysisController));
router.post('/analyze', (req, res, next) => {
  console.log('[ROUTE] Received request on POST /api/news/analyze');
  next();
}, validateNewsAnalysis, newsAnalysisController.analyze.bind(newsAnalysisController));
router.post('/url-check', validateNewsAnalysis, newsAnalysisController.analyze.bind(newsAnalysisController));
router.get('/check/:id', newsController.getFactCheck);

export default router;
