import llmTool from '../tools/llm.tool.js';
import claimExtractionService from '../../services/claimExtraction.service.js';
import { AGENT_NAMES, CLAIM_TYPES } from '../../config/constants.js';
import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Claim Extraction Agent
 * Extracts structured factual claims from article text using LLM,
 * with a deterministic fallback to the existing keyword-based extractor.
 *
 * Now also classifies each claim's type for targeted research:
 *   statistical, political, scientific, historical, news, ranking
 */

const SYSTEM_PROMPT = `You are an expert claim extraction and classification system. Given an article or text, extract the main FACTUAL claims.

Rules:
- Only extract verifiable factual statements.
- You MUST preserve the original user claim's semantic meaning.
- NEVER change the claim meaning. You are NOT allowed to perform negation changes (adding or removing negations like 'not', 'no', etc.), semantic rewriting, claim reversal (e.g. changing false statements to true ones, or vice versa), or adding/removing key entities.
- You are ONLY allowed to perform spelling correction, punctuation cleanup, and whitespace cleanup.
- Remove opinions, speculation, and subjective commentary.
- Remove noise, advertisements, and boilerplate.
- Each claim should be a standalone, self-contained sentence.
- Rate your confidence (0-1) that each extracted text is a factual claim.
- Classify each claim into exactly one type:
  * "statistical" — numeric data, percentages, statistics
  * "political" — government actions, policies, elections
  * "scientific" — research findings, medical claims, scientific facts
  * "historical" — events from the past, dates, historical records
  * "news" — recent events, breaking news, current affairs
  * "ranking" — comparisons, rankings, awards, "best/worst/first/largest"

Return ONLY valid JSON matching this schema:
{
  "claims": [
    { "text": "...", "confidence": 0.92, "claimType": "ranking" }
  ]
}`;

const VALIDATION_PROMPT = `You are a claim semantic integrity validator.
Compare the Original Claim and the Normalized Claim below and determine if their semantic meaning has changed.

Rules:
Allowed changes (do NOT mark meaningChanged as true if only these occur):
- spelling correction
- punctuation cleanup
- whitespace cleanup

Not Allowed changes (MUST mark meaningChanged as true if any of these occur):
- negation changes (e.g. adding or removing "not", "no", "never", "does not", etc.)
- semantic rewriting (altering the core fact, relationship, or assertion)
- claim reversal (e.g. changing a false statement into its true opposite, or vice versa)
- adding/removing entities (people, places, countries, organizations, etc.)

Return JSON:
{
  "meaningChanged": true, // or false
  "reason": "Short explanation of the change or validation success"
}`;

/**
 * Search hint templates for each claim type.
 * ResearchAgent uses these to construct better queries.
 */
const CLAIM_TYPE_SEARCH_HINTS = {
  [CLAIM_TYPES.RANKING]: ['official rankings', 'government survey results', 'official award winners', 'Swachh Survekshan', 'Ministry report'],
  [CLAIM_TYPES.STATISTICAL]: ['official statistics', 'government data', 'census data', 'survey report'],
  [CLAIM_TYPES.POLITICAL]: ['official statement', 'government gazette', 'press release PIB', 'election commission'],
  [CLAIM_TYPES.SCIENTIFIC]: ['peer reviewed study', 'research paper', 'WHO report', 'clinical trial'],
  [CLAIM_TYPES.HISTORICAL]: ['historical records', 'archives', 'documented history'],
  [CLAIM_TYPES.NEWS]: ['news report', 'press conference', 'official announcement'],
};

class ClaimAgent {
  constructor() {
    this.name = AGENT_NAMES.CLAIM;
  }

  /**
   * Extract factual claims from article text.
   * @param {{ articleText: string }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ articleText }) {
    const start = Date.now();
    console.log(`[CLAIM_AGENT] Execution Started`);
    logger.info(`[${this.name}] Starting claim extraction (${articleText.length} chars)`);

    try {
      const result = await llmTool.generateJSON(SYSTEM_PROMPT, articleText);

      if (result && Array.isArray(result.claims) && result.claims.length > 0) {
        // Normalize claim types and attach search hints
        const claims = result.claims.map(c => ({
          text: c.text,
          confidence: c.confidence || 0.5,
          claimType: this._normalizeClaimType(c.claimType),
          searchHints: CLAIM_TYPE_SEARCH_HINTS[this._normalizeClaimType(c.claimType)] || [],
        }));

        // Validate claim semantic integrity before verification
        const originalClaim = articleText.trim();
        const normalizedClaim = claims[0].text.trim();

        // Perform semantic check using LLM
        const validationInput = `Original Claim: "${originalClaim}"\nNormalized Claim: "${normalizedClaim}"`;
        const validationResult = await llmTool.generateJSON(VALIDATION_PROMPT, validationInput);

        if (validationResult && validationResult.meaningChanged === true) {
          logger.error(`[CLAIM_AGENT] CLAIM_MEANING_CHANGED_ERROR: Original: "${originalClaim}" | Normalized: "${normalizedClaim}" | Reason: ${validationResult.reason}`);
          throw new AppError('CLAIM_MEANING_CHANGED_ERROR', 400);
        }

        const avgConfidence = claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
        const executionTimeMs = Date.now() - start;
        console.log(`[CLAIM_AGENT] Execution Ended`);
        logger.info(`[${this.name}] Extracted ${claims.length} claims via LLM in ${executionTimeMs}ms`);

        logger.trace(`[CLAIM_AGENT] Original article: ${articleText.substring(0, 500)}...`);
        logger.trace(`[CLAIM_AGENT] Extracted claims: ${JSON.stringify(claims)}`);
        logger.trace(`[CLAIM_AGENT] Confidence: ${avgConfidence}`);
        logger.trace(`[CLAIM_AGENT] LLM response used: ${JSON.stringify(result)}`);

        return {
          input: { articleText },
          output: { claims },
          reasoning: 'LLM extraction with claim-type classification for targeted research',
          evidenceUsed: result,
          confidence: Math.round(avgConfidence * 100),
          executionTimeMs,
        };
      }

      throw new Error('LLM returned no claims');
    } catch (error) {
      if (error.message === 'CLAIM_MEANING_CHANGED_ERROR') {
        throw error;
      }
      logger.warn(`[${this.name}] LLM extraction failed: ${error.message}. Using deterministic fallback.`);
      return this._fallbackExtraction(articleText, start);
    }
  }

  /**
   * Normalize a claim type string to one of our enum values.
   */
  _normalizeClaimType(type) {
    const normalized = String(type || '').toLowerCase().trim();
    if (Object.values(CLAIM_TYPES).includes(normalized)) return normalized;
    return CLAIM_TYPES.NEWS; // Default
  }

  /**
   * Deterministic fallback using the existing ClaimExtractionService.
   */
  _fallbackExtraction(articleText, startTime) {
    const extractedClaim = claimExtractionService.extractClaim(articleText);
    const keywords = claimExtractionService.extractKeywords(articleText, 5);
    const executionTimeMs = Date.now() - startTime;

    const claims = [];
    if (extractedClaim) {
      claims.push({
        text: extractedClaim,
        confidence: 0.6,
        claimType: CLAIM_TYPES.NEWS,
        searchHints: CLAIM_TYPE_SEARCH_HINTS[CLAIM_TYPES.NEWS] || [],
      });
    }

    console.log(`[CLAIM_AGENT] Execution Ended`);
    logger.info(`[${this.name}] Fallback extracted ${claims.length} claim(s) in ${executionTimeMs}ms`);

    logger.trace(`[CLAIM_AGENT] Original article: ${articleText.substring(0, 500)}...`);
    logger.trace(`[CLAIM_AGENT] Extracted claims: ${JSON.stringify(claims)}`);
    logger.trace(`[CLAIM_AGENT] Confidence: ${claims.length > 0 ? 0.6 : 0.2}`);
    logger.trace(`[CLAIM_AGENT] LLM response used: NONE (Fallback)`);

    return {
      input: { articleText },
      output: { claims, keywords, fallback: true },
      reasoning: 'Deterministic keyword and claim extraction fallback',
      evidenceUsed: null,
      confidence: claims.length > 0 ? 60 : 20,
      executionTimeMs,
    };
  }
}

export default new ClaimAgent();
