import newsAnalysisService from '../services/newsAnalysis.service.js';
import { responseFormatter } from '../../../utils/responseFormatter.js';
import claimExtractionService from '../../../services/claimExtraction.service.js';

class NewsAnalysisController {
  /**
   * Endpoint handler for deep AI analysis of news text
   */
  async analyze(req, res, next) {
    try {
      const { newsText } = req.body;
      const userId = req.user ? req.user._id : null;

      console.log(`[CONTROLLER] Entered news analysis controller`);
      console.log(`[CONTROLLER] Request body: ${JSON.stringify(req.body)}`);
      console.log(`[CONTROLLER] Authenticated user: ${userId || 'anonymous'}`);

      // Service call handles the complex LLM orchestration and database persistence
      const result = await newsAnalysisService.analyzeNews(newsText, userId);

      console.log(`[CONTROLLER] LLM service result obtained. Structuring response for frontend...`);

      // Construct primary claim
      const primaryClaim = (result.analysis.claims && result.analysis.claims[0]) || newsText;

      // Map verdict to frontend expected values
      let mappedVerdict = 'unverified';
      const v = String(result.verdict).toLowerCase();
      if (v === 'real' || v === 'true') {
        mappedVerdict = 'true';
      } else if (v === 'fake' || v === 'false') {
        mappedVerdict = 'false';
      } else if (v === 'mixture') {
        mappedVerdict = 'mixture';
      }

      // Generate keywords
      const keywords = claimExtractionService.extractKeywords(newsText, 5);

      // Serialize response structure to match the frontend expectations
      const serializedResponse = {
        verification: {
          _id: result._id,
          claim: primaryClaim,
          verdict: mappedVerdict,
          confidence: result.confidence,
          explanation: result.analysis.summary || 'No summary available.',
          sources: [
            {
              publisher: `AI Engine (${result.provider})`,
              url: 'https://truthlens.verify.info/ai-report',
              verdict: result.verdict
            }
          ],
          createdAt: result.createdAt
        },
        analysis: {
          extractedClaim: primaryClaim,
          keywords,
          wordCount: newsText.split(/\s+/).filter(Boolean).length
        }
      };

      console.log(`[CONTROLLER] Controller execution completed successfully`);
      return responseFormatter.success(res, serializedResponse, 'Analysis completed successfully');
    } catch (error) {
      console.error(`[CONTROLLER] News analysis failed: ${error.message}`);
      next(error); // Pass to global error handler
    }
  }
}

export default new NewsAnalysisController();
