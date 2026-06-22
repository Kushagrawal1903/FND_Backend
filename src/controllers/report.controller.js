import reportService from '../services/report.service.js';
import { submitReportSchema } from '../validations/report.validation.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Controller for User Report Endpoints
 */
class ReportController {
  /**
   * Submit a new feedback/bug report
   */
  async submitReport(req, res, next) {
    try {
      const { error, value } = submitReportSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      const report = await reportService.submitReport(req.user._id, value);

      res.status(201).json({
        status: 'success',
        message: 'Report submitted successfully',
        data: { report },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get all reports submitted by the logged-in user
   */
  async getMyReports(req, res, next) {
    try {
      const reports = await reportService.getUserReports(req.user._id);

      res.status(200).json({
        status: 'success',
        results: reports.length,
        data: { reports },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new ReportController();
