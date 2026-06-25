import llmTool from '../tools/llm.tool.js';
import { AGENT_NAMES, VERDICTS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Verdict Agent
 * Generates the final verdict using evidence-driven rules + LLM reasoning.
 *
 * Evidence-driven verdict determination:
 * 1. If Tier 1 government source confirms → TRUE
 * 2. If Tier 1 government source denies → FALSE
 * 3. If supportScore > contradictScore × 3 → LIKELY_TRUE
 * 4. If contradictScore > supportScore × 3 → LIKELY_FALSE
 * 5. If both sides have evidence, roughly balanced → MIXTURE
 * 6. If neither side has evidence → INSUFFICIENT_EVIDENCE
 *
 * Confidence is derived from the ratio strength and source authority,
 * NOT from distance-from-50.
 */

const REASONING_PROMPT = `You are a final verdict analyst for a fake news detection system.
Given the evidence summary below, generate 3-5 concise reasoning points explaining WHY the verdict was reached.
Each point should reference specific evidence sources, authority scores, or classifications.

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
   * Generate the final verdict from evidence.
   */
  async execute(input) {
    const start = Date.now();
    console.log(`[VERDICT_AGENT] Execution Started`);
    const { evidenceSummary } = input;

    const {
      supportScore = 0,
      contradictScore = 0,
      governmentSourceConfirms = false,
      governmentSourceDenies = false,
      supportingSources = [],
      contradictingSources = [],
      factCheckStatus,
      biasPenalty = 1,
      failedAgents = [],
    } = evidenceSummary || {};

    logger.info(`[${this.name}] Generating verdict: support=${supportScore}, contradict=${contradictScore}, govConfirm=${governmentSourceConfirms}, govDeny=${governmentSourceDenies}`);

    // Step 1: Evidence-driven verdict
    const verdict = this._deriveVerdict({
      supportScore, contradictScore,
      governmentSourceConfirms, governmentSourceDenies,
      supportingSources, contradictingSources,
      factCheckStatus, failedAgents,
    });

    // Step 2: Calculate confidence from evidence strength
    const confidence = this._calculateConfidence({
      supportScore, contradictScore,
      governmentSourceConfirms, governmentSourceDenies,
      supportingSources, contradictingSources,
      biasPenalty, failedAgents,
    });

    // Step 3: Generate LLM reasoning (best-effort)
    let reasoning = [];
    try {
      reasoning = await this._generateReasoning(input, verdict, confidence, {
        supportScore, contradictScore,
        governmentSourceConfirms, governmentSourceDenies,
        supportingSources, contradictingSources,
      });
    } catch (error) {
      logger.warn(`[${this.name}] LLM reasoning generation failed: ${error.message}. Using rule-based reasoning.`);
      reasoning = this._fallbackReasoning(verdict, {
        supportScore, contradictScore,
        governmentSourceConfirms, governmentSourceDenies,
        supportingSources, contradictingSources,
        factCheckStatus,
      });
    }

    const executionTimeMs = Date.now() - start;
    console.log(`[VERDICT_AGENT] Execution Ended`);
    logger.info(`[${this.name}] Verdict: ${verdict} (confidence: ${confidence}%) in ${executionTimeMs}ms`);

    logger.trace(`[VERDICT_AGENT] Evidence: support=${supportScore}, contradict=${contradictScore}`);
    logger.trace(`[VERDICT_AGENT] Government confirms: ${governmentSourceConfirms}, denies: ${governmentSourceDenies}`);
    logger.trace(`[VERDICT_AGENT] Verdict chosen: ${verdict}, confidence: ${confidence}`);
    logger.trace(`[VERDICT_AGENT] Reasoning: ${reasoning.join(' | ')}`);

    return {
      input: { evidenceSummary },
      output: { verdict, confidence, reasoning },
      urlsVisited: [],
      reasoning: reasoning.join('\n'),
      evidenceUsed: evidenceSummary,
      confidence,
      executionTimeMs,
    };
  }

  /**
   * Evidence-driven verdict determination.
   */
  _deriveVerdict({ supportScore, contradictScore, governmentSourceConfirms, governmentSourceDenies, supportingSources, contradictingSources, factCheckStatus, failedAgents }) {
    // If too many agents failed, we can't be confident
    if (failedAgents.length >= 3) {
      return VERDICTS.INSUFFICIENT_EVIDENCE;
    }

    // Rule 1: Government (Tier 1) source confirms → TRUE
    if (governmentSourceConfirms && !governmentSourceDenies) {
      return VERDICTS.TRUE;
    }

    // Rule 2: Government (Tier 1) source denies → FALSE
    if (governmentSourceDenies && !governmentSourceConfirms) {
      return VERDICTS.FALSE;
    }

    // Rule 3: If supportScore dominates (>3x contradict) → LIKELY_TRUE
    if (supportScore > 0 && supportScore > contradictScore * 3) {
      return VERDICTS.LIKELY_TRUE;
    }

    // Rule 4: If contradictScore dominates (>3x support) → LIKELY_FALSE
    if (contradictScore > 0 && contradictScore > supportScore * 3) {
      return VERDICTS.LIKELY_FALSE;
    }

    // Rule 5: Both sides have evidence, roughly balanced → MIXTURE
    if (supportScore > 0 && contradictScore > 0) {
      return VERDICTS.MIXTURE;
    }

    // Rule 6: Only supporting evidence, no contradiction → LIKELY_TRUE
    if (supportingSources.length > 0 && contradictingSources.length === 0) {
      return VERDICTS.LIKELY_TRUE;
    }

    // Rule 7: Only contradicting evidence, no support → LIKELY_FALSE
    if (contradictingSources.length > 0 && supportingSources.length === 0) {
      return VERDICTS.LIKELY_FALSE;
    }

    // No evidence on either side
    return VERDICTS.INSUFFICIENT_EVIDENCE;
  }

  /**
   * Calculate confidence from evidence strength, not distance-from-50.
   */
  _calculateConfidence({ supportScore, contradictScore, governmentSourceConfirms, governmentSourceDenies, supportingSources, contradictingSources, biasPenalty, failedAgents }) {
    const totalScore = supportScore + contradictScore;
    const totalSources = supportingSources.length + contradictingSources.length;

    if (totalSources === 0) return 10;

    // Base confidence from dominant score ratio
    const dominantScore = Math.max(supportScore, contradictScore);
    let confidence;

    if (totalScore > 0) {
      confidence = Math.round((dominantScore / totalScore) * 100);
    } else {
      confidence = 30;
    }

    // Boost for government source
    if (governmentSourceConfirms || governmentSourceDenies) {
      confidence = Math.min(100, confidence + 15);
    }

    // Boost for multiple sources agreeing
    const dominantCount = supportScore >= contradictScore ? supportingSources.length : contradictingSources.length;
    if (dominantCount >= 3) confidence = Math.min(100, confidence + 5);

    // Apply bias penalty
    confidence = Math.round(confidence * biasPenalty);

    // Penalty for failed agents
    confidence -= failedAgents.length * 5;

    // Capping logic: Never return 100% unless evidence is overwhelming
    // Cap at 95% by default. Allow up to 98% ONLY if:
    // - There are no contradicting sources (for supporting verdicts) or vice versa
    // - We have at least 4 dominant agreeing sources
    // - At least one is a Tier 1 source
    const hasContradiction = contradictingSources.length > 0 && supportingSources.length > 0;
    const isOverwhelming = !hasContradiction && dominantCount >= 4 && (governmentSourceConfirms || governmentSourceDenies);

    let maxConfidence = 95;
    if (isOverwhelming) {
      maxConfidence = 98;
    }

    return Math.min(maxConfidence, Math.max(10, confidence));
  }

  /**
   * Generate reasoning via LLM.
   */
  async _generateReasoning(input, verdict, confidence, evidenceDetails) {
    const evidenceContext = JSON.stringify({
      verdict,
      confidence,
      supportScore: evidenceDetails.supportScore,
      contradictScore: evidenceDetails.contradictScore,
      governmentSourceConfirms: evidenceDetails.governmentSourceConfirms,
      governmentSourceDenies: evidenceDetails.governmentSourceDenies,
      supportingSourceCount: evidenceDetails.supportingSources.length,
      contradictingSourceCount: evidenceDetails.contradictingSources.length,
      topSupportingSources: evidenceDetails.supportingSources.slice(0, 5).map(s => ({
        source: s.source, authorityScore: s.authorityScore, tier: s.sourceTier,
      })),
      topContradictingSources: evidenceDetails.contradictingSources.slice(0, 5).map(s => ({
        source: s.source, authorityScore: s.authorityScore, tier: s.sourceTier,
      })),
      biasExplanation: input.biasResult?.output?.explanation,
      sourceExplanation: input.sourceResult?.output?.explanation,
    }, null, 2);

    logger.trace(`[VERDICT_AGENT] All evidence received: ${evidenceContext}`);
    logger.trace(`[VERDICT_AGENT] Prompt sent to LLM: ${REASONING_PROMPT}`);

    const result = await llmTool.generateJSON(REASONING_PROMPT, evidenceContext);

    logger.trace(`[VERDICT_AGENT] Raw LLM response: ${JSON.stringify(result)}`);

    if (result && Array.isArray(result.reasoning)) {
      return result.reasoning;
    }
    return this._fallbackReasoning(verdict, evidenceDetails);
  }

  /**
   * Deterministic fallback reasoning.
   */
  _fallbackReasoning(verdict, evidenceDetails) {
    const reasons = [];

    const { supportScore, contradictScore, governmentSourceConfirms, governmentSourceDenies, supportingSources, contradictingSources, factCheckStatus } = evidenceDetails;

    if (governmentSourceConfirms) {
      reasons.push('Official government or institutional source confirms this claim.');
    }
    if (governmentSourceDenies) {
      reasons.push('Official government or institutional source contradicts this claim.');
    }

    if (supportingSources.length > 0) {
      const topSource = supportingSources.sort((a, b) => b.authorityScore - a.authorityScore)[0];
      reasons.push(`${supportingSources.length} source(s) support this claim. Top source: ${topSource.source || topSource.title} (authority: ${topSource.authorityScore}/100).`);
    }

    if (contradictingSources.length > 0) {
      const topSource = contradictingSources.sort((a, b) => b.authorityScore - a.authorityScore)[0];
      reasons.push(`${contradictingSources.length} source(s) contradict this claim. Top source: ${topSource.source || topSource.title} (authority: ${topSource.authorityScore}/100).`);
    }

    if (factCheckStatus === 'not_found') {
      reasons.push('No existing fact-check records were found. This is treated as neutral — not as negative evidence.');
    }

    reasons.push(`Authority-weighted scores: support=${supportScore?.toFixed?.(1) || 0}, contradict=${contradictScore?.toFixed?.(1) || 0} → verdict: ${verdict}.`);

    return reasons;
  }
}

export default new VerdictAgent();
