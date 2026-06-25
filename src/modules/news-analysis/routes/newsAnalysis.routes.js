import express from 'express';
import newsAnalysisController from '../controllers/newsAnalysis.controller.js';
import { validateNewsAnalysis } from '../validators/newsAnalysis.validator.js';
import authMiddleware from '../../../middleware/auth.middleware.js';
import { verificationLimiter } from '../../../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Apply auth and rate limiting
// Similar to the existing news check routes, this is protected
router.use(authMiddleware);
router.use(verificationLimiter);

router.use((req, res, next) => {
  console.log(`[ROUTE] Hit: ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @route POST /api/v1/news-analysis/analyze
 * @desc Perform deep LLM-based analysis on news text
 * @access Private
 */
router.post('/analyze', (req, res, next) => {
  console.log('[ROUTE] Received request on POST /api/v1/news-analysis/analyze');
  next();
}, validateNewsAnalysis, newsAnalysisController.analyze.bind(newsAnalysisController));

export default router;
