import FactCheck from '../models/factCheck.model.js';
import User from '../models/user.model.js';
import Report from '../models/report.model.js';
import SavedArticle from '../models/savedArticle.model.js';

/**
 * Service to aggregate statistics and analytics for users, claims, and reports
 */
class AnalyticsService {
  /**
   * Retrieves summary statistics across the database
   * @returns {Promise<Object>} Statistics summary object
   */
  async getSummaryStats() {
    const totalUsers = await User.countDocuments();
    const totalFactChecks = await FactCheck.countDocuments();
    const totalReports = await Report.countDocuments();
    const totalSavedArticles = await SavedArticle.countDocuments();

    // Verdict breakdown
    const verdictAggregation = await FactCheck.aggregate([
      {
        $group: {
          _id: '$verdict',
          count: { $sum: 1 },
        },
      },
    ]);

    const verdicts = {
      true: 0,
      false: 0,
      mixture: 0,
      unverified: 0,
    };

    verdictAggregation.forEach((item) => {
      if (verdicts.hasOwnProperty(item._id)) {
        verdicts[item._id] = item.count;
      }
    });

    // Report status breakdown
    const reportAggregation = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const reports = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
    };

    reportAggregation.forEach((item) => {
      if (reports.hasOwnProperty(item._id)) {
        reports[item._id] = item.count;
      }
    });

    // Average confidence score of fact checks
    const confidenceAggregation = await FactCheck.aggregate([
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' },
        },
      },
    ]);

    const averageConfidence =
      confidenceAggregation.length > 0 ? Math.round(confidenceAggregation[0].avgConfidence) : 0;

    return {
      totals: {
        users: totalUsers,
        factChecks: totalFactChecks,
        reports: totalReports,
        savedArticles: totalSavedArticles,
      },
      verdicts,
      reports,
      averageConfidence,
    };
  }

  /**
   * Gets fact check activity over time (grouped by day for the last 7 days)
   * @returns {Promise<Array>} List of days with transaction counts
   */
  async getRecentActivity() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await FactCheck.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
  }
}

export default new AnalyticsService();
