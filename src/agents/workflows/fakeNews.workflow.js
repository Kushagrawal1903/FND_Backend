import orchestratorAgent from '../orchestrator.agent.js';
import AgentExecution from '../models/AgentExecution.model.js';
import FactCheck from '../../models/factCheck.model.js';
import logger from '../../utils/logger.js';

/**
 * Fake News Analysis Workflow
 * Single entry point for the entire agentic pipeline.
 * Coordinates the orchestrator and persists results to MongoDB.
 *
 * Usage:
 *   import fakeNewsWorkflow from './agents/workflows/fakeNews.workflow.js';
 *   const result = await fakeNewsWorkflow.analyzeArticle({ articleText, url, userId });
 */
class FakeNewsWorkflow {
  /**
   * Analyze an article through the full agentic pipeline.
   * @param {{
   *   articleText: string,
   *   url?: string,
   *   publisher?: string,
   *   userId?: string|null
   * }} params
   * @returns {Promise<Object>} Full agentic analysis result
   */
  async analyzeArticle({ articleText, url = null, publisher = null, userId = null }) {
    console.log('[WORKFLOW] Entered FakeNewsWorkflow.analyzeArticle');
    logger.info(`[WORKFLOW] Starting agentic analysis for user=${userId || 'anonymous'}`);

    // Run the orchestrator pipeline
    const result = await orchestratorAgent.execute({ articleText, url, publisher });

    // Map the agentic verdict to the FactCheck model's verdict enum.
    // The FactCheck model now supports the extended verdicts.
    const mappedVerdict = this._mapVerdict(result.verdict);

    // Persist the high-level result to the FactCheck collection
    // so existing queries against FactCheck continue to work.
    const factCheck = await FactCheck.create({
      userId,
      claim: this._extractPrimaryClaim(result.claims, articleText),
      verdict: mappedVerdict,
      confidence: result.confidence,
      explanation: result.reasoning.join(' '),
      sources: this._extractSources(result),
    });

    // Persist individual agent executions for observability
    await this._saveAgentExecutions(factCheck._id, result.agentExecutionSummary);

    logger.info(`[WORKFLOW] Analysis complete. FactCheck ID: ${factCheck._id}, Verdict: ${mappedVerdict}`);

    // Return the full agentic response envelope
    return {
      articleId: factCheck._id,
      verdict: result.verdict,
      confidence: result.confidence,
      claims: result.claims,
      sourceAnalysis: result.sourceAnalysis,
      factCheckResults: result.factCheckResults,
      researchResults: result.researchResults,
      biasAnalysis: result.biasAnalysis,
      evidenceSummary: result.evidenceSummary,
      reasoning: result.reasoning,
      agentExecutionSummary: result.agentExecutionSummary,
      totalExecutionTimeMs: result.totalExecutionTimeMs,
      createdAt: factCheck.createdAt,
    };
  }

  /**
   * Map agentic verdicts to the FactCheck model's enum values.
   */
  _mapVerdict(verdict) {
    const map = {
      'true': 'true',
      'false': 'false',
      'mixture': 'mixture',
      'likely_true': 'likely_true',
      'likely_false': 'likely_false',
      'insufficient_evidence': 'insufficient_evidence',
      'unverified': 'unverified',
    };
    return map[verdict] || 'unverified';
  }

  /**
   * Extract the primary claim text for the FactCheck record.
   */
  _extractPrimaryClaim(claims, articleText) {
    if (claims && claims.length > 0 && claims[0].text) {
      return claims[0].text;
    }
    // Fallback: first 200 chars of article
    return articleText.substring(0, 200);
  }

  /**
   * Extract source references for the FactCheck record.
   */
  _extractSources(result) {
    const sources = [];

    // From fact-check results
    if (result.factCheckResults) {
      result.factCheckResults.forEach(fc => {
        if (fc.sources) {
          fc.sources.forEach(s => {
            sources.push({
              publisher: s.publisher || 'Fact Checker',
              url: s.url || '',
              verdict: s.verdict || fc.verdict,
            });
          });
        }
      });
    }

    // If no fact-check sources, add the AI engine as source
    if (sources.length === 0) {
      sources.push({
        publisher: 'Agentic AI Pipeline',
        url: 'https://truthlens.verify.info/ai-report',
        verdict: result.verdict,
      });
    }

    return sources;
  }

  /**
   * Persist agent execution records to MongoDB.
   * Non-blocking — errors are logged but don't break the pipeline.
   */
  async _saveAgentExecutions(articleId, executionSummary) {
    try {
      const docs = executionSummary.map(exec => ({
        articleId,
        agentName: exec.agentName,
        input: null, // Not storing inputs to save space; enable if needed for debugging
        output: null, // Not storing full outputs; they're in the response already
        status: exec.status,
        executionTimeMs: exec.executionTimeMs,
        confidence: exec.confidence,
        errorMessage: exec.errorMessage || null,
      }));

      await AgentExecution.insertMany(docs);
      logger.debug(`[WORKFLOW] Saved ${docs.length} agent execution records`);
    } catch (error) {
      // Non-fatal: log and continue
      logger.error(`[WORKFLOW] Failed to save agent executions: ${error.message}`);
    }
  }
}

export default new FakeNewsWorkflow();
