import googleFactCheckTool from '../tools/googleFactCheck.tool.js';
import credibilityService from '../../services/credibility.service.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Fact Check Agent
 * Queries the Google Fact Check API for each claim and aggregates results.
 * Reuses the existing credibility service for verdict normalization.
 */
class FactCheckAgent {
  constructor() {
    this.name = AGENT_NAMES.FACTCHECK;
  }

  /**
   * Fact-check a list of claims.
   * @param {{ claims: Array<{ text: string }> }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ claims }) {
    const start = Date.now();
    console.log(`[FACTCHECK_AGENT] Started`);

    if (!claims || claims.length === 0) {
      logger.warn(`[${this.name}] No claims to fact-check`);
      return {
        output: { results: [], overallVerdict: 'unverified' },
        confidence: 0,
        executionTimeMs: Date.now() - start,
      };
    }

    logger.info(`[${this.name}] Fact-checking ${claims.length} claim(s)`);

    // Fact-check each claim in parallel (the tool handles caching internally)
    const results = await Promise.all(
      claims.map(async (claim) => {
        try {
          const googleClaims = await googleFactCheckTool.searchClaims(claim.text);
          const { verdict, confidence, sources } = credibilityService.calculateCredibility(googleClaims);

          return {
            claim: claim.text,
            factCheckFound: sources.length > 0,
            verdict,
            confidence,
            sources,
          };
        } catch (error) {
          logger.warn(`[${this.name}] Failed to check claim: "${claim.text.substring(0, 50)}...": ${error.message}`);
          return {
            claim: claim.text,
            factCheckFound: false,
            verdict: 'unverified',
            confidence: 0,
            sources: [],
            error: error.message,
          };
        }
      })
    );

    // Calculate overall confidence as the average of individual claim confidences
    const checkedResults = results.filter(r => r.factCheckFound);
    const avgConfidence = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length)
      : 0;

    // Derive overall verdict from individual results
    const overallVerdict = this._deriveOverallVerdict(results);
    const executionTimeMs = Date.now() - start;

    console.log(`[FACTCHECK_AGENT] Completed in ${executionTimeMs} ms`);
    logger.info(`[${this.name}] Completed: ${checkedResults.length}/${results.length} claims found, verdict="${overallVerdict}" in ${executionTimeMs}ms`);

    return {
      output: { results, overallVerdict },
      confidence: avgConfidence,
      executionTimeMs,
    };
  }

  /**
   * Derive a consensus verdict from multiple claim fact-check results.
   */
  _deriveOverallVerdict(results) {
    const found = results.filter(r => r.factCheckFound);
    if (found.length === 0) return 'unverified';

    const verdictCounts = {};
    found.forEach(r => {
      verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
    });

    // Return the most common verdict
    let maxVerdict = 'unverified';
    let maxCount = 0;
    for (const [verdict, count] of Object.entries(verdictCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxVerdict = verdict;
      }
    }

    return maxVerdict;
  }
}

export default new FactCheckAgent();
