import { AGENT_NAMES, FACT_CHECK_STATUSES, SOURCE_TIERS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Evidence Aggregator Agent
 * Replaces the old weighted-average system with authority-weighted evidence scoring.
 * Fully deterministic — no LLM calls.
 *
 * New scoring:
 *   supportScore  = Σ(authorityScore × confidence) for each supporting source
 *   contradictScore = Σ(authorityScore × confidence) for each contradicting source
 *
 * Key rules:
 *   - NOT_FOUND from FactCheckAgent contributes ZERO (neutral)
 *   - VERIFIED_TRUE/VERIFIED_FALSE from FactCheckAgent adds high-weight evidence
 *   - Government (Tier 1) sources get special flags for the VerdictAgent
 */
class EvidenceAgent {
  constructor() {
    this.name = AGENT_NAMES.EVIDENCE;
  }

  /**
   * Aggregate evidence from all agent outputs using authority-weighted scoring.
   */
  async execute(input) {
    const start = Date.now();
    console.log(`[EVIDENCE_AGENT] Execution Started`);
    logger.info(`[${this.name}] Aggregating evidence from all agents`);

    const {
      claimResult,
      sourceResult,
      factCheckResult,
      researchResult,
      biasResult,
      failedAgents = [],
    } = input;

    // ─── Collect all evidence sources with authority weights ───

    const supportingSources = [];
    const contradictingSources = [];

    // 1. Research evidence (primary signal)
    const supporting = researchResult?.output?.supportingEvidence || [];
    const contradicting = researchResult?.output?.contradictingEvidence || [];

    supporting.forEach(e => {
      supportingSources.push({
        url: e.url,
        title: e.title,
        source: e.source,
        snippet: e.snippet || e.evidenceSnippet,
        publishedAt: e.publishedAt,
        authorityScore: e.authorityScore || 40,
        sourceTier: e.sourceTier || SOURCE_TIERS.TIER_3,
        confidence: e.confidence || 50,
        classification: 'supporting',
        explanation: e.explanation,
        origin: 'research',
      });
    });

    contradicting.forEach(e => {
      contradictingSources.push({
        url: e.url,
        title: e.title,
        source: e.source,
        snippet: e.snippet || e.evidenceSnippet,
        publishedAt: e.publishedAt,
        authorityScore: e.authorityScore || 40,
        sourceTier: e.sourceTier || SOURCE_TIERS.TIER_3,
        confidence: e.confidence || 50,
        classification: 'contradicting',
        explanation: e.explanation,
        origin: 'research',
      });
    });

    // 2. Fact-check evidence (only if VERIFIED — NOT_FOUND is ignored)
    const fcResults = factCheckResult?.output?.results || [];
    const fcOverallStatus = factCheckResult?.output?.overallStatus || FACT_CHECK_STATUSES.NOT_FOUND;

    fcResults.forEach(fc => {
      if (fc.status === FACT_CHECK_STATUSES.VERIFIED_TRUE) {
        fc.sources?.forEach(s => {
          supportingSources.push({
            url: s.url || '',
            title: s.publisher || 'Fact Checker',
            source: s.publisher,
            snippet: `Fact check: ${fc.claim} → ${fc.verdict}`,
            publishedAt: null,
            authorityScore: 90,
            sourceTier: SOURCE_TIERS.TIER_2,
            confidence: fc.confidence || 80,
            classification: 'supporting',
            explanation: `Verified TRUE by ${s.publisher}`,
            origin: 'factcheck',
          });
        });
      } else if (fc.status === FACT_CHECK_STATUSES.VERIFIED_FALSE) {
        fc.sources?.forEach(s => {
          contradictingSources.push({
            url: s.url || '',
            title: s.publisher || 'Fact Checker',
            source: s.publisher,
            snippet: `Fact check: ${fc.claim} → ${fc.verdict}`,
            publishedAt: null,
            authorityScore: 90,
            sourceTier: SOURCE_TIERS.TIER_2,
            confidence: fc.confidence || 80,
            classification: 'contradicting',
            explanation: `Verified FALSE by ${s.publisher}`,
            origin: 'factcheck',
          });
        });
      }
      // NOT_FOUND: intentionally contributes nothing — neutral
    });

    // ─── Calculate authority-weighted scores ───

    const supportScore = supportingSources.reduce(
      (sum, s) => sum + (s.authorityScore * s.confidence / 100), 0
    );
    const contradictScore = contradictingSources.reduce(
      (sum, s) => sum + (s.authorityScore * s.confidence / 100), 0
    );

    // Check for government (Tier 1) source confirmation/denial
    const governmentSourceConfirms = supportingSources.some(s => s.sourceTier === SOURCE_TIERS.TIER_1);
    const governmentSourceDenies = contradictingSources.some(s => s.sourceTier === SOURCE_TIERS.TIER_1);

    // Bias penalty (0-1 multiplier, lower = more biased = less trustworthy)
    const biasScore = biasResult?.output?.biasScore ?? 50;
    const biasPenalty = 1 - (biasScore / 200); // 0 bias → 1.0, 100 bias → 0.5

    const executionTimeMs = Date.now() - start;
    console.log(`[EVIDENCE_AGENT] Execution Ended`);

    const evidenceOutput = {
      supportScore: Math.round(supportScore * 100) / 100,
      contradictScore: Math.round(contradictScore * 100) / 100,
      supportingSources,
      contradictingSources,
      governmentSourceConfirms,
      governmentSourceDenies,
      factCheckStatus: fcOverallStatus,
      biasScore,
      biasPenalty: Math.round(biasPenalty * 100) / 100,
      sourceAnalysis: sourceResult?.output || {},
      failedAgents,
    };

    logger.info(`[${this.name}] Support: ${supportScore.toFixed(1)}, Contradict: ${contradictScore.toFixed(1)}, GovConfirm: ${governmentSourceConfirms}, GovDeny: ${governmentSourceDenies}`);
    logger.trace(`[EVIDENCE_AGENT] Supporting sources: ${supportingSources.length}, Contradicting sources: ${contradictingSources.length}`);
    logger.trace(`[EVIDENCE_AGENT] Authority-weighted supportScore: ${supportScore.toFixed(2)}, contradictScore: ${contradictScore.toFixed(2)}`);
    logger.trace(`[EVIDENCE_AGENT] Fact-check status: ${fcOverallStatus} (neutral if NOT_FOUND)`);
    logger.trace(`[EVIDENCE_AGENT] Government source confirms: ${governmentSourceConfirms}, denies: ${governmentSourceDenies}`);
    logger.trace(`[EVIDENCE_AGENT] Bias penalty multiplier: ${biasPenalty.toFixed(2)}`);

    return {
      input: { failedAgents },
      output: evidenceOutput,
      reasoning: `Authority-weighted scoring: support=${supportScore.toFixed(1)} vs contradict=${contradictScore.toFixed(1)}. ${supportingSources.length} supporting, ${contradictingSources.length} contradicting sources.`,
      evidenceUsed: {
        supportingSources,
        contradictingSources,
      },
      confidence: Math.round(Math.max(supportScore, contradictScore)),
      executionTimeMs,
    };
  }
}

export default new EvidenceAgent();
