import webSearchTool from '../tools/webSearch.tool.js';
import newsSearchTool from '../tools/newsSearch.tool.js';
import llmTool from '../tools/llm.tool.js';
import { AGENT_NAMES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

const EVIDENCE_PROMPT = `You are a fact-checking research AI assistant.
Given a CLAIM and a list of related search results, classify each search result into one of the following:
- "supporting" (if it contains credible evidence validating/confirming the claim)
- "contradicting" (if it contains credible evidence debunking/refuting the claim)
- "neutral" (if it is irrelevant, off-topic, or doesn't provide clear evidence either way)

Also, provide a short 1-sentence reason for your classification.
Finally, output an overall confidence score (0-100) representing how strong and reliable the evidence is.

Return ONLY valid JSON matching this schema:
{
  "classifications": [
    {
      "url": "url matching the search result",
      "status": "supporting" | "contradicting" | "neutral",
      "reason": "explanation string"
    }
  ],
  "confidence": 85
}`;

/**
 * Research Agent
 * Searches web and news sources to gather supporting/contradicting evidence for claims.
 * Uses Tavily API and NewsAPI, classifying results via LLM.
 */
class ResearchAgent {
  constructor() {
    this.name = AGENT_NAMES.RESEARCH;
  }

  /**
   * Research claims across web and news sources.
   * @param {{ claims: Array<{ text: string }> }} input
   * @returns {Promise<{ output: Object, confidence: number, executionTimeMs: number }>}
   */
  async execute({ claims }) {
    const start = Date.now();
    console.log(`[RESEARCH_AGENT] Started`);

    if (!claims || claims.length === 0) {
      logger.warn(`[${this.name}] No claims to research`);
      return {
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

    // Research each claim in parallel
    await Promise.all(
      claims.map(async (claim) => {
        try {
          // Run web and news search in parallel for each claim
          const [webResults, newsResults] = await Promise.all([
            webSearchTool.search(claim.text, 3),
            newsSearchTool.search(claim.text, 3),
          ]);

          // Deduplicate web results
          const uniqueWeb = webSearchTool.deduplicate(webResults);

          // Combine results
          const combined = [...uniqueWeb, ...newsResults];

          if (combined.length === 0) {
            console.log(`[RESEARCH_AGENT] No search results found for claim: "${claim.text.substring(0, 50)}..."`);
            return;
          }

          console.log(`[RESEARCH_AGENT] Found ${combined.length} search results for claim: "${claim.text.substring(0, 50)}..."`);

          // Send combined results and claim to LLM for classification
          try {
            const context = JSON.stringify({
              claim: claim.text,
              searchResults: combined.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                source: r.source,
                publishedAt: r.publishedAt
              }))
            }, null, 2);

            const result = await llmTool.generateJSON(EVIDENCE_PROMPT, context);
            
            if (result && Array.isArray(result.classifications)) {
              console.log(`[RESEARCH_AGENT] Classified ${result.classifications.length} search results for claim: "${claim.text.substring(0, 40)}..."`);
              
              // Map classifications back to results
              combined.forEach(res => {
                const match = result.classifications.find(c => c.url === res.url);
                const classification = match?.status || 'neutral';
                const reason = match?.reason || 'No specific explanation provided by LLM.';

                const evidenceItem = {
                  claim: claim.text,
                  source: res.source,
                  title: res.title,
                  url: res.url,
                  snippet: res.snippet,
                  publishedAt: res.publishedAt,
                  explanation: reason
                };

                if (classification === 'supporting') {
                  allSupporting.push(evidenceItem);
                } else if (classification === 'contradicting') {
                  allContradicting.push(evidenceItem);
                }
              });

              if (result.confidence) {
                overallConfidenceSum += result.confidence;
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

    console.log(`[RESEARCH_AGENT] Completed in ${executionTimeMs} ms`);
    logger.info(`[${this.name}] Found ${allSupporting.length} supporting, ${allContradicting.length} contradicting in ${executionTimeMs}ms`);

    return {
      output: {
        supportingEvidence: allSupporting,
        contradictingEvidence: allContradicting,
      },
      confidence: finalConfidence || 10,
      executionTimeMs,
    };
  }
}

export default new ResearchAgent();
