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
    console.log(`[SOURCE_AGENT] Started`);
    const lookupTarget = url || publisher || '';
    logger.info(`[${this.name}] Evaluating source: "${lookupTarget}"`);

    try {
      const reputation = sourceReputationTool.lookup(lookupTarget);
      const executionTimeMs = Date.now() - start;

      // Confidence in our assessment depends on whether we found the source in our DB
      const confidence = reputation.category !== 'unknown' ? 85 : 40;

      console.log(`[SOURCE_AGENT] Completed in ${executionTimeMs} ms`);
      logger.info(`[${this.name}] Source "${reputation.sourceName}" scored ${reputation.trustScore}/100 in ${executionTimeMs}ms`);

      return {
        output: {
          sourceName: reputation.sourceName,
          trustScore: reputation.trustScore,
          category: reputation.category,
          explanation: reputation.explanation,
        },
        confidence,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - start;
      console.log(`[SOURCE_AGENT] Completed in ${executionTimeMs} ms (error)`);
      logger.error(`[${this.name}] Failed: ${error.message}`);

      return {
        output: {
          sourceName: lookupTarget,
          trustScore: 50,
          category: 'unknown',
          explanation: `Source evaluation failed: ${error.message}`,
        },
        confidence: 10,
        executionTimeMs,
      };
    }
  }
}

export default new SourceAgent();
