import SavedArticle from '../models/savedArticle.model.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

/**
 * Service to handle User Profile and Saved Article operations
 */
class UserService {
  /**
   * Saves an article to a user's library
   */
  async saveArticle(userId, articleData) {
    const { title, url, verdict, notes } = articleData;
    return await SavedArticle.create({
      userId,
      title,
      url,
      verdict,
      notes,
    });
  }

  /**
   * Retrieves all articles saved by a specific user
   */
  async getSavedArticles(userId) {
    return await SavedArticle.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Deletes a saved article, verifying ownership
   */
  async deleteSavedArticle(userId, articleId) {
    const article = await SavedArticle.findById(articleId);
    
    if (!article) {
      throw new NotFoundError('Saved article not found');
    }

    // Verify ownership
    if (article.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to delete this saved article');
    }

    await SavedArticle.findByIdAndDelete(articleId);
    return article;
  }
}

export default new UserService();
