import sourceReputationTool from '../tools/sourceReputation.tool.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Source Credibility Agent
 * Evaluates the trustworthiness of a news source based on its domain.
 * Fully deterministic — no LLM calls.
 */
class SourceAgent {
  constructor() {
    this.name = AGENT_NAMES.SOURCE;
  }

  /**
   * Evaluate source credibility.
   * @param {{ url: string, publisher: string }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ url, publisher }) {
    const start = Date.now();
    console.log(`[SOURCE_AGENT] Execution Started`);
    const lookupTarget = url || publisher || '';
    logger.info(`[${this.name}] Evaluating source: "${lookupTarget}"`);

    try {
      const reputation = sourceReputationTool.lookup(lookupTarget);
      const executionTimeMs = Date.now() - start;

      // Confidence in our assessment depends on whether we found the source in our DB
      const confidence = reputation.category !== 'unknown' ? 85 : 40;

      console.log(`[SOURCE_AGENT] Execution Ended`);
      logger.info(`[${this.name}] Source "${reputation.sourceName}" scored ${reputation.trustScore}/100 in ${executionTimeMs}ms`);

      logger.trace(`[SOURCE_AGENT] Source URL: ${url || 'N/A'}`);
      logger.trace(`[SOURCE_AGENT] Domain analyzed: ${reputation.sourceName}`);
      logger.trace(`[SOURCE_AGENT] Reputation score: ${reputation.trustScore}`);
      logger.trace(`[SOURCE_AGENT] Reputation database match: ${reputation.category !== 'unknown'}`);
      logger.trace(`[SOURCE_AGENT] Reasons for score assignment: ${reputation.explanation}`);

      return {
        input: { url, publisher },
        output: {
          sourceName: reputation.sourceName,
          trustScore: reputation.trustScore,
          category: reputation.category,
          sourceTier: reputation.sourceTier,
          authorityScore: reputation.authorityScore,
          explanation: reputation.explanation,
        },
        urlsVisited: url ? [url] : [],
        reasoning: reputation.explanation,
        evidenceUsed: { databaseMatch: reputation.category !== 'unknown', category: reputation.category },
        confidence,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - start;
      console.log(`[SOURCE_AGENT] Execution Ended`);
      logger.error(`[${this.name}] Failed: ${error.message}`);

      logger.trace(`[SOURCE_AGENT] Source URL: ${url || 'N/A'}`);
      logger.trace(`[SOURCE_AGENT] Domain analyzed: N/A`);
      logger.trace(`[SOURCE_AGENT] Reputation score: 50`);
      logger.trace(`[SOURCE_AGENT] Reputation database match: false`);
      logger.trace(`[SOURCE_AGENT] Reasons for score assignment: Failed - ${error.message}`);

      return {
        input: { url, publisher },
        output: {
          sourceName: lookupTarget,
          trustScore: 50,
          category: 'unknown',
          explanation: `Source evaluation failed: ${error.message}`,
        },
        urlsVisited: url ? [url] : [],
        reasoning: `Evaluation failed: ${error.message}`,
        evidenceUsed: null,
        confidence: 10,
        executionTimeMs,
      };
    }
  }
}

export default new SourceAgent();
