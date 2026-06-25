import newsAnalysisService from '../services/newsAnalysis.service.js';
import { responseFormatter } from '../../../utils/responseFormatter.js';
import claimExtractionService from '../../../services/claimExtraction.service.js';

class NewsAnalysisController {
  /**
   * Endpoint handler for deep AI analysis of news text.
   * Now powered by the agentic pipeline.
   */
  async analyze(req, res, next) {
    try {
      const { newsText, url } = req.body;
      const userId = req.user ? req.user._id : null;

      console.log(`[CONTROLLER] Entered news analysis controller (agentic mode)`);

      // Service call runs the full agentic orchestration pipeline
      const result = await newsAnalysisService.analyzeNews(newsText, userId, url);

      // Extract the agentic result attached by the service
      const agentic = result._agenticResult || result.analysis;

      // Construct primary claim from agentic claims
      const primaryClaim = (agentic.claims && agentic.claims[0]?.text) || newsText;

      // Map verdict to frontend expected values (backward-compatible)
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

      // Serialize response — backward-compatible shape + new agentic fields
      const serializedResponse = {
        // ─── Requirement 12 flat structure (top level) ───
        originalClaim: agentic.originalClaim || newsText,
        normalizedClaim: agentic.normalizedClaim || primaryClaim,
        verdict: String(agentic.verdict || result.verdict).toUpperCase(),
        confidence: agentic.confidence || result.confidence,
        reasoning: agentic.reasoning || [],
        supportingSources: agentic.supportingEvidence || [],
        contradictingSources: agentic.contradictingEvidence || [],
        evidenceSources: agentic.evidenceSources || [],
        timeline: agentic.timeline || [],
        executionReport: agentic.executionReport || '',

        // ─── Existing shape (unchanged for frontend compatibility) ───
        verification: {
          _id: result._id,
          claim: primaryClaim,
          verdict: mappedVerdict,
          confidence: result.confidence,
          explanation: agentic.reasoning?.join(' ') || 'No summary available.',
          sources: this._buildSources(agentic),
          createdAt: result.createdAt,
        },
        analysis: {
          extractedClaim: primaryClaim,
          keywords,
          wordCount: newsText.split(/\s+/).filter(Boolean).length,
        },

        // ─── New agentic fields (additive) ───
        agenticAnalysis: {
          articleId: agentic.articleId,
          verdict: agentic.verdict,
          confidence: agentic.confidence,
          claims: agentic.claims || [],
          sourceAnalysis: agentic.sourceAnalysis || {},
          factCheckResults: agentic.factCheckResults || [],
          researchResults: agentic.researchResults || {},
          biasAnalysis: agentic.biasAnalysis || {},
          evidenceSummary: agentic.evidenceSummary || {},
          reasoning: agentic.reasoning || [],
          agentExecutionSummary: agentic.agentExecutionSummary || [],
          totalExecutionTimeMs: agentic.totalExecutionTimeMs,
          timeline: agentic.timeline || [],
          evidenceSources: agentic.evidenceSources || [],
          supportingEvidence: agentic.supportingEvidence || [],
          contradictingEvidence: agentic.contradictingEvidence || [],
          authorityWeightedScore: agentic.authorityWeightedScore || {},
          executionReport: agentic.executionReport || '',
        },
      };

      console.log(`[CONTROLLER] Controller execution completed successfully`);
      return responseFormatter.success(res, serializedResponse, 'Analysis completed successfully');
    } catch (error) {
      console.error(`[CONTROLLER] News analysis failed: ${error.message}`);
      next(error); // Pass to global error handler
    }
  }

  /**
   * Build sources array for backward-compatible response.
   */
  _buildSources(agentic) {
    const sources = [];

    // Pull from fact-check results if available
    if (agentic.factCheckResults) {
      const fcList = Array.isArray(agentic.factCheckResults)
        ? agentic.factCheckResults
        : agentic.factCheckResults.results || [];
      fcList.forEach(fc => {
        if (fc.sources) {
          fc.sources.forEach(s => sources.push(s));
        }
      });
    }

    // Fallback
    if (sources.length === 0) {
      sources.push({
        publisher: 'Agentic AI Pipeline',
        url: '',
        verdict: agentic.verdict || 'unverified',
      });
    }

    return sources;
  }
}

export default new NewsAnalysisController();

