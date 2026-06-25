import googleFactCheckTool from '../tools/googleFactCheck.tool.js';
import credibilityService from '../../services/credibility.service.js';
import { AGENT_NAMES, FACT_CHECK_STATUSES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Fact Check Agent
 * Queries the Google Fact Check API for each claim and aggregates results.
 *
 * Critical design decision:
 *   NOT_FOUND is explicitly NEUTRAL — missing fact-check results
 *   must NOT reduce confidence or push verdict toward "mixture".
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
    console.log(`[FACTCHECK_AGENT] Execution Started`);

    if (!claims || claims.length === 0) {
      logger.warn(`[${this.name}] No claims to fact-check`);
      return {
        input: { claims: [] },
        output: { results: [], overallStatus: FACT_CHECK_STATUSES.NOT_FOUND },
        reasoning: 'No claims provided for fact-checking.',
        confidence: 0,
        executionTimeMs: Date.now() - start,
      };
    }

    logger.info(`[${this.name}] Fact-checking ${claims.length} claim(s)`);

    const results = await Promise.all(
      claims.map(async (claim) => {
        try {
          const googleClaims = await googleFactCheckTool.searchClaims(claim.text);
          const { verdict, confidence, sources } = credibilityService.calculateCredibility(googleClaims);

          logger.trace(`[FACTCHECK_AGENT] Claim being checked: ${claim.text}`);
          logger.trace(`[FACTCHECK_AGENT] Google Fact Check query: ${claim.text}`);
          logger.trace(`[FACTCHECK_AGENT] URLs returned: ${sources.map(s => s.url).join(', ')}`);
          logger.trace(`[FACTCHECK_AGENT] Matched fact-check articles: ${sources.length}`);
          logger.trace(`[FACTCHECK_AGENT] ClaimReview ratings: ${sources.map(s => s.verdict).join(', ')}`);

          if (sources.length === 0) {
            // No fact-check found — this is NOT negative evidence
            return {
              claim: claim.text,
              factCheckFound: false,
              status: FACT_CHECK_STATUSES.NOT_FOUND,
              verdict: 'not_found',
              confidence: 0,
              sources: [],
            };
          }

          // Map credibility service verdict to our status enum
          const status = this._mapToStatus(verdict);

          return {
            claim: claim.text,
            factCheckFound: true,
            status,
            verdict,
            confidence,
            sources,
          };
        } catch (error) {
          logger.warn(`[${this.name}] Failed to check claim: "${claim.text.substring(0, 50)}...": ${error.message}`);
          return {
            claim: claim.text,
            factCheckFound: false,
            status: FACT_CHECK_STATUSES.NOT_FOUND,
            verdict: 'not_found',
            confidence: 0,
            sources: [],
            error: error.message,
          };
        }
      })
    );

    // Only count results where fact-checks were actually found
    const foundResults = results.filter(r => r.factCheckFound);
    const avgConfidence = foundResults.length > 0
      ? Math.round(foundResults.reduce((sum, r) => sum + r.confidence, 0) / foundResults.length)
      : 0;

    const overallStatus = this._deriveOverallStatus(results);
    const executionTimeMs = Date.now() - start;

    console.log(`[FACTCHECK_AGENT] Execution Ended`);
    logger.info(`[${this.name}] Completed: ${foundResults.length}/${results.length} claims found, status="${overallStatus}" in ${executionTimeMs}ms`);

    const allUrls = results.flatMap(r => r.sources?.map(s => s.url) || []).filter(Boolean);

    return {
      input: { claims },
      output: { results, overallStatus },
      urlsVisited: allUrls,
      reasoning: foundResults.length > 0
        ? `Fact-checked ${results.length} claims, ${foundResults.length} matched existing records. Status: ${overallStatus}`
        : `No existing fact-check records found for any of the ${results.length} claims. This is neutral — not negative evidence.`,
      evidenceUsed: foundResults,
      confidence: avgConfidence,
      executionTimeMs,
    };
  }

  /**
   * Map credibility service verdict string to FACT_CHECK_STATUSES.
   */
  _mapToStatus(verdict) {
    const v = String(verdict).toLowerCase();
    if (v === 'true' || v === 'mostly true') return FACT_CHECK_STATUSES.VERIFIED_TRUE;
    if (v === 'false' || v === 'mostly false' || v === 'pants on fire') return FACT_CHECK_STATUSES.VERIFIED_FALSE;
    return FACT_CHECK_STATUSES.NOT_FOUND;
  }

  /**
   * Derive overall status from individual results.
   * NOT_FOUND results are excluded — they are neutral.
   */
  _deriveOverallStatus(results) {
    const found = results.filter(r => r.factCheckFound);
    if (found.length === 0) return FACT_CHECK_STATUSES.NOT_FOUND;

    const statusCounts = {};
    found.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    let maxStatus = FACT_CHECK_STATUSES.NOT_FOUND;
    let maxCount = 0;
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxStatus = status;
      }
    }

    return maxStatus;
  }
}

export default new FactCheckAgent();
