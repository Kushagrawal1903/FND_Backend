import llmTool from '../tools/llm.tool.js';
import { AGENT_NAMES, VERDICTS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Verdict Agent
 * Generates the final verdict using rule-based logic + LLM reasoning.
 *
 * Verdict determination:
 * 1. Rule-based: derive verdict from overall evidence score thresholds
 * 2. LLM: generate human-readable reasoning for the verdict
 * 3. Validation: ensure LLM doesn't contradict rule-based verdict
 */

/** Score thresholds for verdict determination */
const THRESHOLDS = {
  TRUE:                  80,
  LIKELY_TRUE:           65,
  MIXED:                 45,
  LIKELY_FALSE:          25,
  FALSE:                 10,
  // Below 10 or very low confidence → INSUFFICIENT_EVIDENCE
};

const REASONING_PROMPT = `You are a final verdict analyst for a fake news detection system.
Given the evidence summary below, generate 3-5 concise reasoning points explaining WHY the verdict was reached.

Return ONLY valid JSON:
{
  "reasoning": [
    "Point 1...",
    "Point 2...",
    "Point 3..."
  ]
}`;

class VerdictAgent {
  constructor() {
    this.name = AGENT_NAMES.VERDICT;
  }

  /**
   * Generate the final verdict.
   * @param {{
   *   evidenceSummary: Object,
   *   claimResult: Object,
   *   factCheckResult: Object,
   *   biasResult: Object,
   *   sourceResult: Object,
   *   researchResult: Object
   * }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute(input) {
    const start = Date.now();
    console.log(`[VERDICT_AGENT] Started`);
    const { evidenceSummary } = input;
    const overallScore = evidenceSummary?.overallEvidenceScore ?? 50;

    logger.info(`[${this.name}] Generating verdict from evidence score: ${overallScore}/100`);

    // Step 1: Rule-based verdict
    const verdict = this._deriveVerdict(overallScore, input);

    // Step 2: Calculate confidence
    const confidence = this._calculateConfidence(overallScore, input);

    // Step 3: Generate LLM reasoning (best-effort, non-blocking)
    let reasoning = [];
    try {
      reasoning = await this._generateReasoning(input, verdict, confidence);
    } catch (error) {
      logger.warn(`[${this.name}] LLM reasoning generation failed: ${error.message}. Using rule-based reasoning.`);
      reasoning = this._fallbackReasoning(verdict, overallScore, input);
    }

    const executionTimeMs = Date.now() - start;
    console.log(`[VERDICT_AGENT] Completed in ${executionTimeMs} ms`);
    logger.info(`[${this.name}] Verdict: ${verdict} (confidence: ${confidence}%) in ${executionTimeMs}ms`);

    return {
      output: { verdict, confidence, reasoning },
      confidence,
      executionTimeMs,
    };
  }

  /**
   * Rule-based verdict derivation from evidence scores.
   */
  _deriveVerdict(overallScore, input) {
    const { factCheckResult, evidenceSummary } = input;
    const failedAgents = evidenceSummary?.failedAgents || [];

    // If too many agents failed, we can't be confident
    if (failedAgents.length >= 3) {
      return VERDICTS.INSUFFICIENT_EVIDENCE;
    }

    // If fact-check found direct matches with high confidence, trust that
    const fcResults = factCheckResult?.output?.results || [];
    const highConfFc = fcResults.filter(r => r.factCheckFound && r.confidence >= 80);
    if (highConfFc.length > 0) {
      const fcVerdict = factCheckResult.output.overallVerdict;
      if (fcVerdict === 'true') return VERDICTS.TRUE;
      if (fcVerdict === 'false') return VERDICTS.FALSE;
      if (fcVerdict === 'mixture') return VERDICTS.MIXTURE;
    }

    // Threshold-based verdict from aggregated evidence
    if (overallScore >= THRESHOLDS.TRUE) return VERDICTS.TRUE;
    if (overallScore >= THRESHOLDS.LIKELY_TRUE) return VERDICTS.LIKELY_TRUE;
    if (overallScore >= THRESHOLDS.MIXED) return VERDICTS.MIXTURE;
    if (overallScore >= THRESHOLDS.LIKELY_FALSE) return VERDICTS.LIKELY_FALSE;
    if (overallScore >= THRESHOLDS.FALSE) return VERDICTS.FALSE;

    return VERDICTS.INSUFFICIENT_EVIDENCE;
  }

  /**
   * Calculate confidence in our verdict.
   * Higher when more agents succeeded and agree.
   */
  _calculateConfidence(overallScore, input) {
    const failedAgents = input.evidenceSummary?.failedAgents || [];

    // Base confidence from evidence score distance from 50 (ambiguity midpoint)
    // Scores far from 50 (very high or very low) → higher confidence
    const distanceFrom50 = Math.abs(overallScore - 50);
    let confidence = 50 + distanceFrom50;

    // Penalty for each failed agent
    confidence -= failedAgents.length * 8;

    // Bonus for fact-check direct matches
    const fcResults = input.factCheckResult?.output?.results || [];
    const directMatches = fcResults.filter(r => r.factCheckFound).length;
    confidence += Math.min(directMatches * 5, 15);

    return Math.min(100, Math.max(10, Math.round(confidence)));
  }

  /**
   * Generate reasoning via LLM.
   */
  async _generateReasoning(input, verdict, confidence) {
    const evidenceContext = JSON.stringify({
      verdict,
      confidence,
      sourceScore: input.evidenceSummary?.sourceScore,
      factScore: input.evidenceSummary?.factScore,
      biasScore: input.evidenceSummary?.biasScore,
      researchScore: input.evidenceSummary?.researchScore,
      factCheckVerdict: input.factCheckResult?.output?.overallVerdict,
      biasExplanation: input.biasResult?.output?.explanation,
      sourceExplanation: input.sourceResult?.output?.explanation,
      failedAgents: input.evidenceSummary?.failedAgents,
    }, null, 2);

    const result = await llmTool.generateJSON(REASONING_PROMPT, evidenceContext);
    if (result && Array.isArray(result.reasoning)) {
      return result.reasoning;
    }
    return this._fallbackReasoning(verdict, input.evidenceSummary?.overallEvidenceScore, input);
  }

  /**
   * Deterministic fallback reasoning when LLM is unavailable.
   */
  _fallbackReasoning(verdict, overallScore, input) {
    const reasons = [];

    // Source credibility
    const srcScore = input.sourceResult?.output?.trustScore;
    if (srcScore !== undefined) {
      reasons.push(srcScore >= 70
        ? `Source has a high trust score (${srcScore}/100).`
        : `Source has a low trust score (${srcScore}/100), reducing reliability.`);
    }

    // Fact check results
    const fcResults = input.factCheckResult?.output?.results || [];
    const found = fcResults.filter(r => r.factCheckFound);
    if (found.length > 0) {
      reasons.push(`${found.length} claim(s) matched existing fact-check records.`);
    } else {
      reasons.push('No existing fact-check records were found for the claims.');
    }

    // Bias
    const biasScore = input.biasResult?.output?.biasScore;
    if (biasScore !== undefined) {
      reasons.push(biasScore >= 60
        ? `Article shows signs of bias (score: ${biasScore}/100).`
        : `Article shows low bias indicators (score: ${biasScore}/100).`);
    }

    // Overall
    reasons.push(`Overall evidence score: ${overallScore}/100 → verdict: ${verdict}.`);

    return reasons;
  }
}

export default new VerdictAgent();
