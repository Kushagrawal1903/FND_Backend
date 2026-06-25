import WorkflowState from './workflow.state.js';
import PlannerAgent from '../agents/planner.agent.js';
import ContentIntelligenceAgent from '../agents/content.agent.js';
import EvidenceRetrievalAgent from '../agents/evidence.agent.js';
import SourceCredibilityAgent from '../agents/credibility.agent.js';
import ReasoningAgent from '../agents/reasoning.agent.js';
import VerificationAgent from '../agents/verification.agent.js';
import ReportAgent from '../agents/report.agent.js';
import ToolRegistry from '../tools/ToolRegistry.js';
import claimExtractionService from '../services/claimExtraction.service.js';
import llmService from '../services/llm/llm.service.js';
import logger from '../utils/logger.js';
import { startTimer, stopTimer } from '../utils/timer.js';
import evidencePreparer from '../utils/evidencePreparer.js';
import { config } from '../config/env.js';

class AgentOrchestrator {
  constructor({
    agents,
    toolRegistry = ToolRegistry.createDefault(),
    confidenceThreshold = 75,
    maxEvidenceRounds = 3,
    maxAgentRetries = 1,
    reasoningMaxPromptTokens = config.agent.reasoningMaxPromptTokens,
  } = {}) {
    this.toolRegistry = toolRegistry;
    this.confidenceThreshold = confidenceThreshold;
    this.maxEvidenceRounds = maxEvidenceRounds;
    this.maxAgentRetries = maxAgentRetries;
    this.reasoningMaxPromptTokens = reasoningMaxPromptTokens;
    this.agents = agents || this._createDefaultAgents();
  }

  async verify({ originalInput, refinedClaim = null, metadata = {} }) {
    const state = new WorkflowState({
      originalInput,
      refinedClaim,
      metadata: {
        confidenceThreshold: this.confidenceThreshold,
        maxEvidenceRounds: this.maxEvidenceRounds,
        ...metadata,
      },
    });

    try {
      const plan = await this._runAgent('planner', state);
      state.setPlan(plan);

      const content = await this._runAgent('content', state);
      state.setContent(content);

      let requestedExecutionPlan = this._getExecutionPlanTools(plan);
      logger.info('[ORCHESTRATOR] Execution Plan', requestedExecutionPlan);
      logger.info('[ORCHESTRATOR] Planner Selected Tools', requestedExecutionPlan.map(step => step.provider));

      while (state.metadata.evidenceRound < state.metadata.maxEvidenceRounds) {
        state.incrementEvidenceRound();

        const evidenceOutput = await this._runAgent('evidence', state, { executionPlan: requestedExecutionPlan });
        state.addEvidence(evidenceOutput.evidence);

        const credibility = await this._runAgent('credibility', state);
        state.setCredibility(credibility);

        const preparedEvidence = evidencePreparer.prepare({
          claim: state.content?.mainClaim || state.extractedClaim || state.originalInput,
          evidence: state.evidence,
          credibility: state.credibility,
          maxPromptTokens: this.reasoningMaxPromptTokens,
        });
        state.setPreparedEvidence(preparedEvidence);

        const reasoning = await this._runAgent('reasoning', state);
        state.setReasoning(reasoning);

        const verification = await this._runAgent('verification', state);
        state.setVerification(verification);

        if (!verification.requestAdditionalEvidence || verification.approved) {
          break;
        }

        requestedExecutionPlan = verification.requestedExecutionPlan || this._providersToExecutionPlan(verification.requestedProviders || []);
      }

      const report = await this._runAgent('report', state);
      state.setReport(report);
    } catch (error) {
      state.addError(error, { orchestrator: 'AgentOrchestrator' });
      state.setReport(this._buildFailureReport(state, error));
    } finally {
      state.finish();
      if (state.report?.executionMetadata) {
        state.report.executionMetadata.timings = state.getTimingSummary();
      }
    }

    const response = {
      ...state.report,
      workflowState: state.toJSON(),
      timings: state.getTimingSummary(),
    };

    this._assertSerializable(response, 'AgentOrchestrator.verify response');

    return response;
  }

  async _runAgent(agentKey, state, options = {}) {
    const agent = this.agents[agentKey];
    if (!agent || typeof agent.execute !== 'function') {
      throw new Error(`Agent "${agentKey}" is not configured.`);
    }

    let lastError;

    for (let attempt = 0; attempt <= this.maxAgentRetries; attempt += 1) {
      const startedAt = new Date().toISOString();
      const timer = startTimer();
      const input = this._summarizeAgentInput(agentKey, state, options);
      logger.info(`[AGENT:${agentKey}] start`, { startedAt, attempt, input });

      try {
        const output = await agent.execute(state, options);
        const durationMs = stopTimer(timer);
        const endedAt = new Date().toISOString();
        state.addAgentTiming(agentKey, durationMs);
        state.addHistory({
          type: 'agent',
          agent: agentKey,
          startedAt,
          endedAt,
          durationMs,
          input,
          output: this._summarizeAgentOutput(agentKey, output),
          retries: attempt,
        });
        logger.info(`[AGENT:${agentKey}] end`, { endedAt, durationMs });
        return output;
      } catch (error) {
        const durationMs = stopTimer(timer);
        const endedAt = new Date().toISOString();
        state.addAgentTiming(agentKey, durationMs);
        state.incrementRetry(`agent:${agentKey}`);
        lastError = error;

        const normalizedError = state.addError(error, { agent: agentKey, attempt });
        state.addHistory({
          type: 'agent',
          agent: agentKey,
          startedAt,
          endedAt,
          durationMs,
          input,
          output: null,
          errors: [normalizedError],
          retries: attempt,
        });
        logger.error(`[AGENT:${agentKey}] error`, { endedAt, durationMs, error: error.message });
      }
    }

    throw lastError;
  }

  _createDefaultAgents() {
    return {
      planner: new PlannerAgent(),
      content: new ContentIntelligenceAgent({ claimExtractionService }),
      evidence: new EvidenceRetrievalAgent({ toolRegistry: this.toolRegistry }),
      credibility: new SourceCredibilityAgent({ toolRegistry: this.toolRegistry }),
      reasoning: new ReasoningAgent({ llmService }),
      verification: new VerificationAgent({ confidenceThreshold: this.confidenceThreshold }),
      report: new ReportAgent(),
    };
  }

  _summarizeAgentInput(agentKey, state, options) {
    return {
      agent: agentKey,
      claim: state.extractedClaim || state.originalInput,
      evidenceCount: state.evidence.length,
      confidence: state.confidence,
      evidenceRound: state.metadata.evidenceRound,
      options,
    };
  }

  _getExecutionPlanTools(plan) {
    if (Array.isArray(plan?.executionPlan) && plan.executionPlan.length > 0) {
      return plan.executionPlan
        .filter(step => step?.provider)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }

    return this._providersToExecutionPlan(plan?.tools || plan?.evidenceProviders || []);
  }

  _providersToExecutionPlan(providers = []) {
    return providers.map((provider, index) => ({
      order: index + 1,
      provider,
      reason: 'Selected by planner or verification agent.',
    }));
  }

  _buildFailureReport(state, error) {
    return {
      verdict: 'Insufficient Evidence',
      confidence: 0,
      supportingEvidence: [],
      conflictingEvidence: [],
      reasoning: [`The workflow failed safely: ${error.message}`],
      explanation: `Verification could not complete due to an internal workflow error: ${error.message}`,
      summary: 'Verification failed safely before a reliable verdict could be produced.',
      references: [],
      evidence: state.evidence,
      credibility: state.credibility,
      executionMetadata: state.getExecutionMetadata(),
    };
  }

  _summarizeAgentOutput(agentKey, output) {
    if (!output || typeof output !== 'object') {
      return output;
    }

    if (agentKey === 'report') {
      return {
        verdict: output.verdict,
        confidence: output.confidence,
        reasoningSummary: Array.isArray(output.reasoning) ? output.reasoning.slice(0, 3) : [],
        evidenceCount: Array.isArray(output.evidence) ? output.evidence.length : 0,
        referenceCount: Array.isArray(output.references) ? output.references.length : 0,
        hasExecutionMetadata: Boolean(output.executionMetadata),
      };
    }

    if (agentKey === 'evidence') {
      return {
        query: output.query,
        providersUsed: output.providersUsed,
        evidenceCount: Array.isArray(output.evidence) ? output.evidence.length : 0,
      };
    }

    if (agentKey === 'credibility') {
      return {
        sourceCount: Array.isArray(output) ? output.length : 0,
        averageTrustScore: Array.isArray(output) && output.length > 0
          ? Math.round(output.reduce((sum, item) => sum + Number(item.trustScore || 0), 0) / output.length)
          : 0,
      };
    }

    if (agentKey === 'reasoning') {
      return {
        verdict: output.verdict,
        confidence: output.confidence,
        reasoningSummary: Array.isArray(output.reasoning) ? output.reasoning.slice(0, 3) : [],
        supportingEvidenceCount: Array.isArray(output.supportingEvidence) ? output.supportingEvidence.length : 0,
        conflictingEvidenceCount: Array.isArray(output.conflictingEvidence) ? output.conflictingEvidence.length : 0,
      };
    }

    if (agentKey === 'verification') {
      return {
        approved: output.approved,
        confidence: output.confidence,
        sufficient: output.sufficient,
        requestAdditionalEvidence: output.requestAdditionalEvidence,
        requestedProviders: output.requestedProviders,
        reason: output.reason,
      };
    }

    return output;
  }

  _assertSerializable(value, label) {
    try {
      JSON.stringify(value);
    } catch (error) {
      throw new Error(`${label} is not JSON serializable. Circular reference or unsupported value detected: ${error.message}`);
    }
  }
}

export default new AgentOrchestrator();
export { AgentOrchestrator };
