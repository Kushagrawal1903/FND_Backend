import claimAgent from './claim/claim.agent.js';
import sourceAgent from './source/source.agent.js';
import factCheckAgent from './factcheck/factcheck.agent.js';
import researchAgent from './research/research.agent.js';
import biasAgent from './bias/bias.agent.js';
import evidenceAgent from './evidence/evidence.agent.js';
import verdictAgent from './verdict/verdict.agent.js';
import { AGENT_NAMES } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Orchestrator Agent
 * Coordinates the execution of all sub-agents in the correct order:
 *
 * 1. Claim Agent (must run first — other agents depend on its output)
 * 2. Source + FactCheck + Research + Bias agents (parallel — independent of each other)
 * 3. Evidence Agent (needs all above)
 * 4. Verdict Agent (needs evidence summary)
 *
 * Uses Promise.allSettled for graceful degradation — if any agent fails,
 * the pipeline continues with reduced confidence rather than failing entirely.
 */
class OrchestratorAgent {
  constructor() {
    this.name = AGENT_NAMES.ORCHESTRATOR;
  }

  /**
   * Run the full analysis pipeline.
   * @param {{ articleText: string, url?: string, publisher?: string }} input
   * @returns {Promise<{
   *   claims: Array,
   *   sourceAnalysis: Object,
   *   factCheckResults: Array,
   *   researchResults: Object,
   *   biasAnalysis: Object,
   *   evidenceSummary: Object,
   *   verdict: string,
   *   confidence: number,
   *   reasoning: Array,
   *   agentExecutionSummary: Array
   * }>}
   */
  async execute({ articleText, url, publisher }) {
    const pipelineStart = Date.now();
    const agentExecutions = [];
    const failedAgents = [];

    console.log(`[ORCHESTRATOR] Execution Started`);
    logger.info(`[${this.name}] Starting agentic pipeline (${articleText.length} chars)`);

    // ─── Step 1: Claim Extraction (must complete before fact-check & research) ───
    let claimResult;
    try {
      claimResult = await claimAgent.execute({ articleText });
      agentExecutions.push(this._toSummary(claimAgent.name, claimResult));
    } catch (error) {
      logger.error(`[${this.name}] Claim agent FAILED: ${error.message}`);
      claimResult = this._failedResult(claimAgent.name, error);
      failedAgents.push(claimAgent.name);
      agentExecutions.push(this._toSummary(claimAgent.name, claimResult, 'failed', error.message));
    }

    const claims = claimResult.output?.claims || [];

    // ─── Step 2: Parallel execution of independent agents ───
    const [sourceSettled, factCheckSettled, researchSettled, biasSettled] = await Promise.allSettled([
      sourceAgent.execute({ url, publisher }),
      factCheckAgent.execute({ claims }),
      researchAgent.execute({ claims }),
      biasAgent.execute({ articleText }),
    ]);

    // Unwrap settled results
    const sourceResult = this._unwrapSettled(sourceSettled, sourceAgent.name, failedAgents, agentExecutions);
    const factCheckResult = this._unwrapSettled(factCheckSettled, factCheckAgent.name, failedAgents, agentExecutions);
    const researchResult = this._unwrapSettled(researchSettled, researchAgent.name, failedAgents, agentExecutions);
    const biasResult = this._unwrapSettled(biasSettled, biasAgent.name, failedAgents, agentExecutions);

    // ─── Step 3: Evidence Aggregation ───
    let evidenceResult;
    try {
      evidenceResult = await evidenceAgent.execute({
        claimResult,
        sourceResult,
        factCheckResult,
        researchResult,
        biasResult,
        failedAgents,
      });
      agentExecutions.push(this._toSummary(evidenceAgent.name, evidenceResult));
    } catch (error) {
      logger.error(`[${this.name}] Evidence agent FAILED: ${error.message}`);
      evidenceResult = this._failedResult(evidenceAgent.name, error);
      failedAgents.push(evidenceAgent.name);
      agentExecutions.push(this._toSummary(evidenceAgent.name, evidenceResult, 'failed', error.message));
    }

    // ─── Step 4: Verdict Generation ───
    let verdictResult;
    try {
      verdictResult = await verdictAgent.execute({
        evidenceSummary: evidenceResult.output,
        claimResult,
        factCheckResult,
        biasResult,
        sourceResult,
        researchResult,
      });
      agentExecutions.push(this._toSummary(verdictAgent.name, verdictResult));
    } catch (error) {
      logger.error(`[${this.name}] Verdict agent FAILED: ${error.message}`);
      verdictResult = this._failedResult(verdictAgent.name, error);
      failedAgents.push(verdictAgent.name);
      agentExecutions.push(this._toSummary(verdictAgent.name, verdictResult, 'failed', error.message));
    }

    const totalTimeMs = Date.now() - pipelineStart;
    console.log(`[ORCHESTRATOR] Execution Ended`);
    logger.info(`[${this.name}] Pipeline complete in ${totalTimeMs}ms. Failed agents: [${failedAgents.join(', ') || 'none'}]`);

    // ─── Assemble final response ───
    return {
      claims: claims,
      sourceAnalysis: sourceResult.output || {},
      factCheckResults: factCheckResult.output || {},
      researchResults: researchResult.output || {},
      biasAnalysis: biasResult.output || {},
      evidenceSummary: evidenceResult.output || {},
      verdict: verdictResult.output?.verdict || 'insufficient_evidence',
      confidence: verdictResult.output?.confidence || 0,
      reasoning: verdictResult.output?.reasoning || [],
      agentExecutionSummary: agentExecutions,
      totalExecutionTimeMs: totalTimeMs,
      failedAgents,
    };
  }

  /**
   * Unwrap a Promise.allSettled result. If rejected, log and record the failure.
   */
  _unwrapSettled(settled, agentName, failedAgents, agentExecutions) {
    if (settled.status === 'fulfilled') {
      agentExecutions.push(this._toSummary(agentName, settled.value));
      return settled.value;
    }

    // Agent rejected
    const error = settled.reason;
    logger.error(`[${this.name}] ${agentName} FAILED: ${error?.message || error}`);
    failedAgents.push(agentName);
    const failedResult = this._failedResult(agentName, error);
    agentExecutions.push(this._toSummary(agentName, failedResult, 'failed', error?.message));
    return failedResult;
  }

  /**
   * Create a standard failed result object.
   */
  _failedResult(agentName, error) {
    return {
      output: null,
      confidence: 0,
      executionTimeMs: 0,
      error: error?.message || 'Unknown error',
    };
  }

  _toSummary(agentName, result, status = 'success', errorMessage = null) {
    return {
      agentName,
      status,
      executionTimeMs: result.executionTimeMs || 0,
      confidence: result.confidence || 0,
      input: result.input || null,
      output: result.output || null,
      reasoning: result.reasoning || null,
      urlsVisited: result.urlsVisited || [],
      evidenceUsed: result.evidenceUsed || null,
      ...(errorMessage && { errorMessage }),
    };
  }
}

export default new OrchestratorAgent();
