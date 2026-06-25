import adminService from '../services/admin.service.js';
import analyticsService from '../services/analytics.service.js';
import { BadRequestError } from '../utils/errors.js';
import {
  createUserSchema,
  updateUserSchema,
  createFactCheckSchema,
  updateFactCheckSchema,
  createReportSchema,
  updateReportSchema,
  createSavedArticleSchema,
  updateSavedArticleSchema
} from '../validations/admin.validation.js';

/**
 * Controller to handle Admin CRUD Operations
 */
class AdminController {
  // ==========================================
  // USER CRUD ACTIONS
  // ==========================================

  async createUser(req, res, next) {
    try {
      const { error, value } = createUserSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const user = await adminService.createUser(value);
      res.status(201).json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const users = await adminService.getAllUsers();
      res.status(200).json({ status: 'success', results: users.length, data: { users } });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await adminService.getUserById(req.params.id);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { error, value } = updateUserSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const user = await adminService.updateUser(req.params.id, value);
      res.status(200).json({ status: 'success', data: { user } });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await adminService.deleteUser(req.params.id);
      res.status(200).json({ status: 'success', message: 'User and all related records deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // FACTCHECK CRUD ACTIONS
  // ==========================================

  async createFactCheck(req, res, next) {
    try {
      const { error, value } = createFactCheckSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const factCheck = await adminService.createFactCheck(value);
      res.status(201).json({ status: 'success', data: { factCheck } });
    } catch (err) {
      next(err);
    }
  }

  async getAllFactChecks(req, res, next) {
    try {
      const factChecks = await adminService.getAllFactChecks();
      res.status(200).json({ status: 'success', results: factChecks.length, data: { factChecks } });
    } catch (err) {
      next(err);
    }
  }

  async getFactCheckById(req, res, next) {
    try {
      const factCheck = await adminService.getFactCheckById(req.params.id);
      res.status(200).json({ status: 'success', data: { factCheck } });
    } catch (err) {
      next(err);
    }
  }

  async updateFactCheck(req, res, next) {
    try {
      const { error, value } = updateFactCheckSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const factCheck = await adminService.updateFactCheck(req.params.id, value);
      res.status(200).json({ status: 'success', data: { factCheck } });
    } catch (err) {
      next(err);
    }
  }

  async deleteFactCheck(req, res, next) {
    try {
      await adminService.deleteFactCheck(req.params.id);
      res.status(200).json({ status: 'success', message: 'FactCheck record deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // REPORT CRUD ACTIONS
  // ==========================================

  async createReport(req, res, next) {
    try {
      const { error, value } = createReportSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const report = await adminService.createReport(value);
      res.status(201).json({ status: 'success', data: { report } });
    } catch (err) {
      next(err);
    }
  }

  async getAllReports(req, res, next) {
    try {
      const reports = await adminService.getAllReports();
      res.status(200).json({ status: 'success', results: reports.length, data: { reports } });
    } catch (err) {
      next(err);
    }
  }

  async getReportById(req, res, next) {
    try {
      const report = await adminService.getReportById(req.params.id);
      res.status(200).json({ status: 'success', data: { report } });
    } catch (err) {
      next(err);
    }
  }

  async updateReport(req, res, next) {
    try {
      const { error, value } = updateReportSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const report = await adminService.updateReport(req.params.id, value);
      res.status(200).json({ status: 'success', data: { report } });
    } catch (err) {
      next(err);
    }
  }

  async deleteReport(req, res, next) {
    try {
      await adminService.deleteReport(req.params.id);
      res.status(200).json({ status: 'success', message: 'Report record deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SAVED ARTICLE CRUD ACTIONS
  // ==========================================

  async createSavedArticle(req, res, next) {
    try {
      const { error, value } = createSavedArticleSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const article = await adminService.createSavedArticle(value);
      res.status(201).json({ status: 'success', data: { article } });
    } catch (err) {
      next(err);
    }
  }

  async getAllSavedArticles(req, res, next) {
    try {
      const articles = await adminService.getAllSavedArticles();
      res.status(200).json({ status: 'success', results: articles.length, data: { articles } });
    } catch (err) {
      next(err);
    }
  }

  async getSavedArticleById(req, res, next) {
    try {
      const article = await adminService.getSavedArticleById(req.params.id);
      res.status(200).json({ status: 'success', data: { article } });
    } catch (err) {
      next(err);
    }
  }

  async updateSavedArticle(req, res, next) {
    try {
      const { error, value } = updateSavedArticleSchema.validate(req.body);
      if (error) throw new BadRequestError(error.details[0].message);

      const article = await adminService.updateSavedArticle(req.params.id, value);
      res.status(200).json({ status: 'success', data: { article } });
    } catch (err) {
      next(err);
    }
  }

  async deleteSavedArticle(req, res, next) {
    try {
      await adminService.deleteSavedArticle(req.params.id);
      res.status(200).json({ status: 'success', message: 'Saved article deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // DASHBOARD ANALYTICS
  // ==========================================

  async getAnalytics(req, res, next) {
    try {
      const stats = await analyticsService.getSummaryStats();
      const recentActivity = await analyticsService.getRecentActivity();
      res.status(200).json({
        status: 'success',
        data: {
          stats,
          recentActivity,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
