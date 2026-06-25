import webSearchTool from '../tools/webSearch.tool.js';
import newsSearchTool from '../tools/newsSearch.tool.js';
import llmTool from '../tools/llm.tool.js';
import sourceReputationTool from '../tools/sourceReputation.tool.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

const EVIDENCE_PROMPT = `You are a fact-checking research AI assistant.
Given a CLAIM and a list of related search results, classify each search result into one of the following:
- "supporting" (if it contains credible evidence validating/confirming the claim)
- "contradicting" (if it contains credible evidence debunking/refuting the claim)
- "neutral" (if it is irrelevant, off-topic, or doesn't provide clear evidence either way)

Also provide:
- A short 1-sentence reason for your classification
- A confidence score (0-100) for how strongly this source supports or contradicts the claim

Return ONLY valid JSON matching this schema:
{
  "classifications": [
    {
      "url": "url matching the search result",
      "status": "supporting" | "contradicting" | "neutral",
      "reason": "explanation string",
      "confidence": 85
    }
  ],
  "overallConfidence": 85
}`;

/**
 * Research Agent
 * Searches web and news sources to gather supporting/contradicting evidence for claims.
 * Uses Tavily API and NewsAPI, classifying results via LLM.
 *
 * Key improvement: Every evidence item is enriched with sourceTier and authorityScore
 * from the sourceReputation tool. Claims with searchHints trigger additional targeted queries.
 */
class ResearchAgent {
  constructor() {
    this.name = AGENT_NAMES.RESEARCH;
  }

  /**
   * Research claims across web and news sources.
   * @param {{ claims: Array<{ text: string, claimType?: string, searchHints?: string[] }> }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ claims }) {
    const start = Date.now();
    console.log(`[RESEARCH_AGENT] Execution Started`);

    if (!claims || claims.length === 0) {
      logger.warn(`[${this.name}] No claims to research`);
      return {
        input: { claims: [] },
        output: { supportingEvidence: [], contradictingEvidence: [] },
        confidence: 0,
        executionTimeMs: Date.now() - start,
      };
    }

    logger.info(`[${this.name}] Researching ${claims.length} claim(s)`);

    const allSupporting = [];
    const allContradicting = [];
    let overallConfidenceSum = 0;
    let claimsWithResultsCount = 0;
    const allUrls = new Set();

    await Promise.all(
      claims.map(async (claim) => {
        try {
          // Build search queries — base query + claim-type-specific queries
          const queries = this._buildSearchQueries(claim);
          logger.trace(`[RESEARCH_AGENT] Search queries for "${claim.text.substring(0, 50)}...": ${JSON.stringify(queries)}`);

          // Run all queries in parallel
          const searchPromises = queries.flatMap(q => [
            webSearchTool.search(q, 3),
            newsSearchTool.search(q, 3),
          ]);
          const searchResultArrays = await Promise.all(searchPromises);

          // Flatten and deduplicate
          const allResults = searchResultArrays.flat();
          let combined = webSearchTool.deduplicate(allResults);

          // Filter out outdated news articles (older than 3 years) if we have enough fresh evidence
          const threeYearsAgo = new Date();
          threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
          const freshResults = combined.filter(r => {
            if (!r.publishedAt) return true; // Keep if no date available
            const d = new Date(r.publishedAt);
            return !isNaN(d.getTime()) && d >= threeYearsAgo;
          });

          if (freshResults.length >= 3) {
            combined = freshResults;
          }

          if (combined.length === 0) {
            console.log(`[RESEARCH_AGENT] No search results found for claim: "${claim.text.substring(0, 50)}..."`);
            return;
          }

          console.log(`[RESEARCH_AGENT] Found ${combined.length} search results (after date filtering) for claim: "${claim.text.substring(0, 50)}..."`);

          // Enrich each result with authority data
          combined.forEach(r => {
            const { sourceTier, authorityScore } = sourceReputationTool.getAuthorityForUrl(r.url);
            r.sourceTier = sourceTier;
            r.authorityScore = authorityScore;
            allUrls.add(r.url);
          });

          // Classify via LLM
          try {
            const context = JSON.stringify({
              claim: claim.text,
              claimType: claim.claimType || 'news',
              searchResults: combined.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                source: r.source,
                publishedAt: r.publishedAt,
                authorityScore: r.authorityScore,
                sourceTier: r.sourceTier,
              }))
            }, null, 2);

            logger.trace(`[RESEARCH_AGENT] Tavily/News API query: ${claim.text}`);
            logger.trace(`[RESEARCH_AGENT] URLs discovered: ${combined.map(r => r.url).join(', ')}`);

            const result = await llmTool.generateJSON(EVIDENCE_PROMPT, context);

            if (result && Array.isArray(result.classifications)) {
              console.log(`[RESEARCH_AGENT] Classified ${result.classifications.length} search results for claim: "${claim.text.substring(0, 40)}..."`);

              combined.forEach(res => {
                const match = result.classifications.find(c => c.url === res.url);
                const classification = match?.status || 'neutral';
                const reason = match?.reason || 'No specific explanation provided by LLM.';
                const sourceConfidence = match?.confidence ?? 50;

                logger.trace(`[RESEARCH_AGENT] Classification for ${res.url}: ${classification.toUpperCase()} (confidence: ${sourceConfidence})`);
                logger.trace(`[RESEARCH_AGENT] Reason: ${reason}`);

                const evidenceItem = {
                  claim: claim.text,
                  source: res.source,
                  title: res.title,
                  url: res.url,
                  snippet: res.snippet,
                  publishedAt: res.publishedAt,
                  authorityScore: res.authorityScore,
                  sourceTier: res.sourceTier,
                  classification,
                  confidence: sourceConfidence,
                  evidenceSnippet: res.snippet,
                  explanation: reason,
                };

                if (classification === 'supporting') {
                  allSupporting.push(evidenceItem);
                } else if (classification === 'contradicting') {
                  allContradicting.push(evidenceItem);
                }
              });

              if (result.overallConfidence) {
                overallConfidenceSum += result.overallConfidence;
                claimsWithResultsCount++;
              }
            } else {
              throw new Error('Invalid LLM classification response');
            }
          } catch (llmErr) {
            logger.warn(`[RESEARCH_AGENT] LLM classification failed: ${llmErr.message}. Treating all as neutral.`);
          }
        } catch (error) {
          logger.warn(`[${this.name}] Research failed for claim: "${claim.text.substring(0, 50)}...": ${error.message}`);
        }
      })
    );

    const executionTimeMs = Date.now() - start;
    const finalConfidence = claimsWithResultsCount > 0
      ? Math.round(overallConfidenceSum / claimsWithResultsCount)
      : 10;

    console.log(`[RESEARCH_AGENT] Execution Ended`);
    logger.info(`[${this.name}] Found ${allSupporting.length} supporting, ${allContradicting.length} contradicting in ${executionTimeMs}ms`);

    return {
      input: { claims },
      output: {
        supportingEvidence: allSupporting,
        contradictingEvidence: allContradicting,
      },
      urlsVisited: Array.from(allUrls),
      reasoning: `Found ${allSupporting.length} supporting and ${allContradicting.length} contradicting evidence items from ${allUrls.size} URLs.`,
      evidenceUsed: { supporting: allSupporting, contradicting: allContradicting },
      confidence: finalConfidence || 10,
      executionTimeMs,
    };
  }

  /**
   * Build search queries for a claim, including claim-type-specific targeted queries.
   * For example, a "ranking" claim gets additional queries like "official rankings [claim text]".
   */
  _buildSearchQueries(claim) {
    const queries = [claim.text];
    const hints = claim.searchHints || [];

    // Add up to 2 targeted queries using search hints
    for (let i = 0; i < Math.min(hints.length, 2); i++) {
      queries.push(`${hints[i]} ${claim.text}`);
    }

    return queries;
  }
}

export default new ResearchAgent();
