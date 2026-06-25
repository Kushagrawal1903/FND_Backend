import Report from '../models/report.model.js';
import { REPORT_STATUS } from '../config/constants.js';

/**
 * Service to handle User Report requests
 */
class ReportService {
  /**
   * Submit a new bug/claim report by a user
   * @param {string} userId - User ID who creates the report
   * @param {Object} reportData - Report title and description
   * @returns {Promise<Object>} The created report
   */
  async submitReport(userId, reportData) {
    const { title, description } = reportData;
    return await Report.create({
      title,
      description,
      status: REPORT_STATUS.PENDING,
      createdBy: userId,
    });
  }

  /**
   * Retrieves all reports submitted by a specific user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} List of reports
   */
  async getUserReports(userId) {
    return await Report.find({ createdBy: userId }).sort({ createdAt: -1 });
  }
}

export default new ReportService();
