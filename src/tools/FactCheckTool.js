/**
 * FactCheckTool
 * 
 * Wraps the existing Google Fact Check API integration and credibility
 * scoring service as a reusable evidence tool.
 * 
 * WHY THIS EXISTS:
 * The Google Fact Check integration already exists in googleFactCheck.service.js
 * and credibility.service.js. This tool is a thin adapter — it delegates to
 * those services and combines their results into a structured format the agent
 * can reason over. Zero logic duplication.
 * 
 * REUSES:
 * - googleFactCheckService.searchClaims()
 * - credibilityService.calculateCredibility()
 */

import googleFactCheckService from '../services/googleFactCheck.service.js';
import credibilityService from '../services/credibility.service.js';

class FactCheckTool {
  constructor() {
    this.name = 'FactCheckTool';
    this.description = 'Searches the Google Fact Check database for existing fact-check reports about a claim. Returns matching fact-check results from trusted publishers (PolitiFact, Snopes, FactCheck.org, etc.) along with a credibility assessment.';
  }

  /**
   * Execute the fact check tool
   * @param {string} input - The claim or query to search for
   * @returns {Promise<{claims: Array, credibility: {verdict: string, confidence: number, sources: Array}, claimCount: number}>}
   */
  async execute(input) {
    console.log(`[FACT CHECK TOOL] Searching for: "${input}"`);

    try {
      // Delegate to existing Google Fact Check service
      const claims = await googleFactCheckService.searchClaims(input);

      // Delegate to existing credibility service for scoring
      const credibility = credibilityService.calculateCredibility(claims);

      console.log(`[FACT CHECK TOOL] Found ${claims.length} claims, verdict: ${credibility.verdict}`);

      return {
        claims: claims.map(claim => ({
          text: claim.text || '',
          claimant: claim.claimant || 'Unknown',
          reviews: (claim.claimReview || []).map(review => ({
            publisher: review.publisher?.name || 'Unknown',
            url: review.url || '',
            title: review.title || '',
            rating: review.textualRating || 'Unrated',
          })),
        })),
        credibility: {
          verdict: credibility.verdict,
          confidence: credibility.confidence,
          sources: credibility.sources,
        },
        claimCount: claims.length,
      };
    } catch (error) {
      console.error(`[FACT CHECK TOOL] Error: ${error.message}`);
      return {
        claims: [],
        credibility: { verdict: 'unverified', confidence: 0, sources: [] },
        claimCount: 0,
        error: error.message,
      };
    }
  }
}

export default FactCheckTool;
