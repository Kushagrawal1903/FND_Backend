import express from 'express';
import adminController from '../controllers/admin.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = express.Router();

// Enforce authentication and administrator role on all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Analytics Route
router.get('/analytics', adminController.getAnalytics);

// User CRUD Routes
router.post('/users', adminController.createUser);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// FactCheck CRUD Routes
router.post('/factchecks', adminController.createFactCheck);
router.get('/factchecks', adminController.getAllFactChecks);
router.get('/factchecks/:id', adminController.getFactCheckById);
router.put('/factchecks/:id', adminController.updateFactCheck);
router.delete('/factchecks/:id', adminController.deleteFactCheck);

// Report CRUD Routes
router.post('/reports', adminController.createReport);
router.get('/reports', adminController.getAllReports);
router.get('/reports/:id', adminController.getReportById);
router.put('/reports/:id', adminController.updateReport);
router.delete('/reports/:id', adminController.deleteReport);

// SavedArticle CRUD Routes
router.post('/articles', adminController.createSavedArticle);
router.get('/articles', adminController.getAllSavedArticles);
router.get('/articles/:id', adminController.getSavedArticleById);
router.put('/articles/:id', adminController.updateSavedArticle);
router.delete('/articles/:id', adminController.deleteSavedArticle);

export default router;
