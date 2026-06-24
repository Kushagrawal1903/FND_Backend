import newsService from '../services/news.service.js';
import { checkSchema, analyzeSchema, urlCheckSchema } from '../validations/news.validation.js';
import { BadRequestError } from '../utils/errors.js';
import { agentExecutor } from '../agent/truthLensAgent.js';
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
      });
    } catch (error) {
      next(error);
    }
    
  }
  /**
 * AI Agent powered analysis
 */
async agentAnalyze(req, res, next) {
  try {
    const { claim } = req.body;

    if (!claim) {
      throw new BadRequestError('Claim is required');
    }

    const result = await agentExecutor.invoke({
      input: claim,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });

  } catch (error) {
    next(error);
  }
}
}


export default new NewsController();
