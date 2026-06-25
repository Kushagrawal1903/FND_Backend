import llmTool from '../tools/llm.tool.js';
import claimExtractionService from '../../services/claimExtraction.service.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Claim Extraction Agent
 * Extracts structured factual claims from article text using LLM,
 * with a deterministic fallback to the existing keyword-based extractor.
 */

const SYSTEM_PROMPT = `You are an expert claim extraction system. Given an article or text, extract the main FACTUAL claims.

Rules:
- Only extract verifiable factual statements
- Remove opinions, speculation, and subjective commentary
- Remove noise, advertisements, and boilerplate
- Each claim should be a standalone, self-contained sentence
- Rate your confidence (0-1) that each extracted text is a factual claim

Return ONLY valid JSON matching this schema:
{
  "claims": [
    { "text": "...", "confidence": 0.92 }
  ]
}`;

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
    console.log(`[CLAIM_AGENT] Started`);
    logger.info(`[${this.name}] Starting claim extraction (${articleText.length} chars)`);

    try {
      // Primary: LLM-based extraction
      const result = await llmTool.generateJSON(SYSTEM_PROMPT, articleText);

      if (result && Array.isArray(result.claims) && result.claims.length > 0) {
        const avgConfidence = result.claims.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / result.claims.length;
        const executionTimeMs = Date.now() - start;
        console.log(`[CLAIM_AGENT] Completed in ${executionTimeMs} ms`);
        logger.info(`[${this.name}] Extracted ${result.claims.length} claims via LLM in ${executionTimeMs}ms`);

        return {
          output: { claims: result.claims },
          confidence: Math.round(avgConfidence * 100),
          executionTimeMs,
        };
      }

      // LLM returned no claims — fall through to deterministic fallback
      throw new Error('LLM returned no claims');
    } catch (error) {
      logger.warn(`[${this.name}] LLM extraction failed: ${error.message}. Using deterministic fallback.`);
      return this._fallbackExtraction(articleText, start);
    }
  }

  /**
   * Deterministic fallback using the existing ClaimExtractionService.
   * Wraps the result into the same output shape as the LLM path.
   */
  _fallbackExtraction(articleText, startTime) {
    const extractedClaim = claimExtractionService.extractClaim(articleText);
    const keywords = claimExtractionService.extractKeywords(articleText, 5);
    const executionTimeMs = Date.now() - startTime;

    const claims = [];
    if (extractedClaim) {
      claims.push({ text: extractedClaim, confidence: 0.6 });
    }

    console.log(`[CLAIM_AGENT] Completed in ${executionTimeMs} ms (fallback)`);
    logger.info(`[${this.name}] Fallback extracted ${claims.length} claim(s) in ${executionTimeMs}ms`);

    return {
      output: { claims, keywords, fallback: true },
      confidence: claims.length > 0 ? 60 : 20,
      executionTimeMs,
    };
  }
}

export default new ClaimAgent();
