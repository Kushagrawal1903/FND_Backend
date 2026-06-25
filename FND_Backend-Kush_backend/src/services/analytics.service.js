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

    // AI request metrics from FactCheck metadata
    const geminiRequests = await FactCheck.countDocuments({ 'metadata.modelUsed': { $regex: /^Gemini/i } });
    const groqRequests = await FactCheck.countDocuments({ 'metadata.modelUsed': { $regex: /^Groq/i } });
    const cacheHits = await FactCheck.countDocuments({ 'metadata.cached': true });

    // Calculate performance statistics
    const timingAggregation = await FactCheck.aggregate([
      {
        $match: { 'metadata.timings': { $exists: true } }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$metadata.timings.totalVerification' },
          fastestVerification: { $min: '$metadata.timings.totalVerification' },
          slowestVerification: { $max: '$metadata.timings.totalVerification' },
          avgLlmReasoning: { $avg: '$metadata.timings.llmReasoning' },
          avgGoogleFactCheck: { $avg: '$metadata.timings.googleFactCheck' },
          avgNewsApi: { $avg: '$metadata.timings.newsApi' },
          avgTavily: { $avg: '$metadata.timings.tavily' },
          avgMongoHistory: { $avg: '$metadata.timings.mongoHistory' },
        }
      }
    ]);

    const timingsStats = timingAggregation.length > 0 ? {
      avgResponseTime: Math.round(timingAggregation[0].avgResponseTime || 0),
      fastestVerification: Math.round(timingAggregation[0].fastestVerification || 0),
      slowestVerification: Math.round(timingAggregation[0].slowestVerification || 0),
      avgLlmReasoning: Math.round(timingAggregation[0].avgLlmReasoning || 0),
      avgGoogleFactCheck: Math.round(timingAggregation[0].avgGoogleFactCheck || 0),
      avgNewsApi: Math.round(timingAggregation[0].avgNewsApi || 0),
      avgTavily: Math.round(timingAggregation[0].avgTavily || 0),
      avgMongoHistory: Math.round(timingAggregation[0].avgMongoHistory || 0),
    } : {
      avgResponseTime: 0,
      fastestVerification: 0,
      slowestVerification: 0,
      avgLlmReasoning: 0,
      avgGoogleFactCheck: 0,
      avgNewsApi: 0,
      avgTavily: 0,
      avgMongoHistory: 0,
    };

    return {
      totals: {
        users: totalUsers,
        factChecks: totalFactChecks,
        reports: totalReports,
        savedArticles: totalSavedArticles,
        geminiRequests,
        groqRequests,
        cacheHits,
        avgResponseTime: timingsStats.avgResponseTime,
        fastestVerification: timingsStats.fastestVerification,
        slowestVerification: timingsStats.slowestVerification,
        avgLlmReasoning: timingsStats.avgLlmReasoning,
        avgGoogleFactCheck: timingsStats.avgGoogleFactCheck,
        avgNewsApi: timingsStats.avgNewsApi,
        avgTavily: timingsStats.avgTavily,
        avgMongoHistory: timingsStats.avgMongoHistory,
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
