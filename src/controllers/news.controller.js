import newsService from '../services/news.service.js';
import { checkSchema, analyzeSchema, urlCheckSchema } from '../validations/news.validation.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Controller for News Claim Verification Endpoints
 */
class NewsController {
  /**
   * Quick check for a text-based news claim
   */
  async check(req, res, next) {
    try {
      // Validate input schema
      const { error, value } = checkSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      // Check if user is authenticated (attached by optional/required auth middleware)
      const userId = req.user ? req.user._id : null;

      // Delegate to service
      const factCheck = await newsService.verifyClaim(value.claim, userId);

      res.status(200).json({
        status: 'success',
        data: factCheck,
        performance: factCheck.performance || {
          factCheckMs: 0.00,
          newsSearchMs: 0.00,
          webSearchMs: 0.00,
          credibilityMs: 0.00,
          llmAnalysisMs: 0.00,
          totalMs: 0.00,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific fact-check by ID
   */
  async getFactCheck(req, res, next) {
    try {
      const { id } = req.params;
      const factCheck = await newsService.getFactCheckById(id);
      const factCheckObj = factCheck.toObject ? factCheck.toObject() : factCheck;

      res.status(200).json({
        status: 'success',
        data: factCheckObj,
        performance: factCheckObj.performance || {
          factCheckMs: 0.00,
          newsSearchMs: 0.00,
          webSearchMs: 0.00,
          credibilityMs: 0.00,
          llmAnalysisMs: 0.00,
          totalMs: 0.00,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deep analysis of a text block (including keyword and word count analysis)
   */
  async analyze(req, res, next) {
    try {
      // Validate input schema
      const { error, value } = analyzeSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      const userId = req.user ? req.user._id : null;

      // Delegate to service
      const analysisResult = await newsService.analyzeText(value.claim, userId);

      res.status(200).json({
        status: 'success',
        data: analysisResult,
        performance: (analysisResult.verification && analysisResult.verification.performance) || {
          factCheckMs: 0.00,
          newsSearchMs: 0.00,
          webSearchMs: 0.00,
          credibilityMs: 0.00,
          llmAnalysisMs: 0.00,
          totalMs: 0.00,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verification of a specific URL (extracts page metadata & runs check)
   */
  async urlCheck(req, res, next) {
    try {
      // Validate input schema
      const { error, value } = urlCheckSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      const userId = req.user ? req.user._id : null;

      // Delegate to service
      const urlCheckResult = await newsService.verifyUrl(value.url, userId);

      res.status(200).json({
        status: 'success',
        data: urlCheckResult,
        performance: (urlCheckResult.verification && urlCheckResult.verification.performance) || {
          factCheckMs: 0.00,
          newsSearchMs: 0.00,
          webSearchMs: 0.00,
          credibilityMs: 0.00,
          llmAnalysisMs: 0.00,
          totalMs: 0.00,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new NewsController();
