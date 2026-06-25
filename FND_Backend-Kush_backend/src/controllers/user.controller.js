import userService from '../services/user.service.js';
import { saveArticleSchema } from '../validations/user.validation.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Controller for User-specific operations (Saved Articles, Profiles)
 */
class UserController {
  /**
   * Save an article to user's saved articles library
   */
  async saveArticle(req, res, next) {
    try {
      const { error, value } = saveArticleSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      const savedArticle = await userService.saveArticle(req.user._id, value);

      res.status(201).json({
        status: 'success',
        message: 'Article saved successfully',
        data: { savedArticle },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all articles saved by current authenticated user
   */
  async getMySavedArticles(req, res, next) {
    try {
      const articles = await userService.getSavedArticles(req.user._id);

      res.status(200).json({
        status: 'success',
        results: articles.length,
        data: { articles },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove an article from current user's saved list
   */
  async deleteSavedArticle(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteSavedArticle(req.user._id, id);

      res.status(200).json({
        status: 'success',
        message: 'Saved article deleted successfully from your list',
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new UserController();
