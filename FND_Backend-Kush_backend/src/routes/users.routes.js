import express from 'express';
import userController from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

// Enforce authentication on all user library routes
router.use(authMiddleware);

// Saved Articles endpoints
router.post('/saved-articles', userController.saveArticle);
router.get('/saved-articles', userController.getMySavedArticles);
router.delete('/saved-articles/:id', userController.deleteSavedArticle);

export default router;
