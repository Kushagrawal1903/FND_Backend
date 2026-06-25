import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Evidence Aggregator Agent
 * Merges evidence from all other agents into a unified scoring system.
 * Fully deterministic — no LLM calls.
 *
 * Scoring weights:
 *   Source credibility  → 15%
 *   Fact check results  → 35%
 *   Research evidence   → 20%
 *   Bias analysis       → 15%
 *   Claim extraction    → 15% (confidence in extracted claims)
 */

const WEIGHTS = {
  source: 0.15,
  factCheck: 0.35,
  research: 0.20,
  bias: 0.15,
  claim: 0.15,
};

class EvidenceAgent {
  constructor() {
    this.name = AGENT_NAMES.EVIDENCE;
  }

  /**
   * Aggregate evidence from all agent outputs.
   * @param {{
   *   claimResult: { output: Object, confidence: number },
   *   sourceResult: { output: Object, confidence: number },
   *   factCheckResult: { output: Object, confidence: number },
   *   researchResult: { output: Object, confidence: number },
   *   biasResult: { output: Object, confidence: number },
   *   failedAgents: string[]
   * }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute(input) {
    const start = Date.now();
    console.log(`[EVIDENCE_AGENT] Started`);
    logger.info(`[${this.name}] Aggregating evidence from all agents`);

    const {
      claimResult,
      sourceResult,
      factCheckResult,
      researchResult,
      biasResult,
      failedAgents = [],
    } = input;

    // Calculate individual dimension scores (0-100)
    const sourceScore = this._calcSourceScore(sourceResult);
    const factScore = this._calcFactScore(factCheckResult);
    const researchScore = this._calcResearchScore(researchResult);
    const biasScore = this._calcBiasScore(biasResult);
    const claimScore = claimResult?.confidence || 0;

    // Weighted overall score
    // If an agent failed, redistribute its weight proportionally
    let activeWeights = { ...WEIGHTS };
    if (failedAgents.length > 0) {
      activeWeights = this._redistributeWeights(failedAgents);
    }

    const overallEvidenceScore = Math.round(
      (sourceScore * activeWeights.source) +
      (factScore * activeWeights.factCheck) +
      (researchScore * activeWeights.research) +
      // For bias, invert the score: high bias → low evidence quality
      ((100 - biasScore) * activeWeights.bias) +
      (claimScore * activeWeights.claim)
    );

    const executionTimeMs = Date.now() - start;
    console.log(`[EVIDENCE_AGENT] Completed in ${executionTimeMs} ms`);
    logger.info(`[${this.name}] Overall evidence score: ${overallEvidenceScore}/100 in ${executionTimeMs}ms`);

    return {
      output: {
        sourceScore,
        factScore,
        researchScore,
        biasScore,
        claimScore,
        overallEvidenceScore,
        weights: activeWeights,
        failedAgents,
      },
      confidence: overallEvidenceScore,
      executionTimeMs,
    };
  }

  /** Source score: direct trust score from the source agent */
  _calcSourceScore(sourceResult) {
    return sourceResult?.output?.trustScore ?? 50;
  }

  /** Fact check score: based on average confidence of found fact-checks */
  _calcFactScore(factCheckResult) {
    if (!factCheckResult?.output?.results) return 0;
    const results = factCheckResult.output.results;
    if (results.length === 0) return 0;

    const found = results.filter(r => r.factCheckFound);
    if (found.length === 0) return 20; // Some claims checked but nothing found

    return Math.round(found.reduce((sum, r) => sum + r.confidence, 0) / found.length);
  }

  /** Research score: based on amount and quality of evidence found */
  _calcResearchScore(researchResult) {
    if (!researchResult?.output) return 10;
    const { supportingEvidence = [], contradictingEvidence = [] } = researchResult.output;
    const total = supportingEvidence.length + contradictingEvidence.length;
    if (total === 0) return 10; // Stubs return nothing

    // More evidence = higher score, capped at 90
    return Math.min(90, 30 + (total * 10));
  }

  /** Bias score: average of all bias dimensions (higher = more biased) */
  _calcBiasScore(biasResult) {
    if (!biasResult?.output) return 50;
    const { biasScore = 50, clickbaitScore = 50, emotionalManipulationScore = 50, sensationalismScore = 50 } = biasResult.output;
    return Math.round((biasScore + clickbaitScore + emotionalManipulationScore + sensationalismScore) / 4);
  }

  /**
   * Redistribute weights when agents fail.
   * Failed agent weights are distributed proportionally among remaining agents.
   */
  _redistributeWeights(failedAgents) {
    const agentKeyMap = {
      [AGENT_NAMES.SOURCE]: 'source',
      [AGENT_NAMES.FACTCHECK]: 'factCheck',
      [AGENT_NAMES.RESEARCH]: 'research',
      [AGENT_NAMES.BIAS]: 'bias',
      [AGENT_NAMES.CLAIM]: 'claim',
    };

    const adjusted = { ...WEIGHTS };
    let removedWeight = 0;
    const failedKeys = [];

    for (const agentName of failedAgents) {
      const key = agentKeyMap[agentName];
      if (key && adjusted[key]) {
        removedWeight += adjusted[key];
        adjusted[key] = 0;
        failedKeys.push(key);
      }
    }

    // Redistribute removed weight proportionally
    if (removedWeight > 0) {
      const activeKeys = Object.keys(adjusted).filter(k => adjusted[k] > 0);
      const activeTotal = activeKeys.reduce((sum, k) => sum + adjusted[k], 0);

      for (const key of activeKeys) {
        adjusted[key] += removedWeight * (adjusted[key] / activeTotal);
      }
    }

    return adjusted;
  }
}

export default new EvidenceAgent();
