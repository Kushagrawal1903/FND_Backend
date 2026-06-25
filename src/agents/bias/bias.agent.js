import llmTool from '../tools/llm.tool.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Bias Detection Agent
 * Detects political bias, clickbait, sensationalism, and emotional manipulation
 * in article text using LLM analysis.
 */

const SYSTEM_PROMPT = `You are an expert media bias and manipulation detection system.
Analyze the provided text for:
1. Political bias (left, center-left, center, center-right, right)
2. Clickbait tactics (exaggerated headlines, curiosity gaps, misleading previews)
3. Sensationalism (dramatic language, hyperbole, alarmism)
4. Emotional manipulation (fear-mongering, anger-inducing, guilt-tripping)

Return ONLY valid JSON matching this schema:
{
  "biasScore": <number 0-100, where 0=no bias, 100=extreme bias>,
  "politicalLeaning": "left" | "center-left" | "center" | "center-right" | "right" | "unknown",
  "clickbaitScore": <number 0-100>,
  "sensationalismScore": <number 0-100>,
  "emotionalManipulationScore": <number 0-100>,
  "explanation": "<2-3 sentence explanation of detected bias patterns>"
}`;

class BiasAgent {
  constructor() {
    this.name = AGENT_NAMES.BIAS;
  }

  /**
   * Detect bias in article text.
   * @param {{ articleText: string }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ articleText }) {
    const start = Date.now();
    console.log(`[BIAS_AGENT] Execution Started`);
    logger.info(`[${this.name}] Starting bias detection (${articleText.length} chars)`);

    try {
      const result = await llmTool.generateJSON(SYSTEM_PROMPT, articleText);

      if (result && typeof result.biasScore === 'number') {
        const executionTimeMs = Date.now() - start;
        console.log(`[BIAS_AGENT] Execution Ended`);
        logger.info(`[${this.name}] Bias score: ${result.biasScore}/100, clickbait: ${result.clickbaitScore}/100 in ${executionTimeMs}ms`);

        logger.trace(`[BIAS_AGENT] LLM prompt: ${SYSTEM_PROMPT}`);
        logger.trace(`[BIAS_AGENT] LLM response: ${JSON.stringify(result)}`);
        logger.trace(`[BIAS_AGENT] Loaded language detected: ${result.sensationalismScore}`);
        logger.trace(`[BIAS_AGENT] Emotional language detected: ${result.emotionalManipulationScore}`);
        logger.trace(`[BIAS_AGENT] Clickbait indicators: ${result.clickbaitScore}`);
        logger.trace(`[BIAS_AGENT] Bias score reasoning: ${result.explanation}`);

        return {
          input: { articleText },
          output: {
            biasScore: this._clamp(result.biasScore),
            politicalLeaning: result.politicalLeaning || 'unknown',
            clickbaitScore: this._clamp(result.clickbaitScore || 0),
            sensationalismScore: this._clamp(result.sensationalismScore || 0),
            emotionalManipulationScore: this._clamp(result.emotionalManipulationScore || 0),
            explanation: result.explanation || '',
          },
          reasoning: result.explanation || '',
          evidenceUsed: result,
          confidence: 75,
          executionTimeMs,
        };
      }

      throw new Error('LLM returned invalid bias analysis format');
    } catch (error) {
      const executionTimeMs = Date.now() - start;
      console.log(`[BIAS_AGENT] Execution Ended`);
      logger.warn(`[${this.name}] LLM bias detection failed: ${error.message}. Using neutral defaults.`);

      logger.trace(`[BIAS_AGENT] LLM prompt: ${SYSTEM_PROMPT}`);
      logger.trace(`[BIAS_AGENT] LLM response: NONE (Failed)`);
      logger.trace(`[BIAS_AGENT] Loaded language detected: 50`);
      logger.trace(`[BIAS_AGENT] Emotional language detected: 50`);
      logger.trace(`[BIAS_AGENT] Clickbait indicators: 50`);
      logger.trace(`[BIAS_AGENT] Bias score reasoning: Failed - ${error.message}`);

      // Graceful degradation: return neutral scores
      return {
        input: { articleText },
        output: {
          biasScore: 50,
          politicalLeaning: 'unknown',
          clickbaitScore: 50,
          sensationalismScore: 50,
          emotionalManipulationScore: 50,
          explanation: `Bias analysis unavailable: ${error.message}`,
        },
        reasoning: `Analysis failed: ${error.message}`,
        evidenceUsed: null,
        confidence: 10,
        executionTimeMs,
      };
    }
  }

  /** Clamp a score to 0-100 range */
  _clamp(value) {
    return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
  }
}

export default new BiasAgent();
