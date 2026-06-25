import { startTimer, stopTimer } from '../utils/timer.js';

class WorkflowState {
  constructor({ originalInput, refinedClaim = null, metadata = {} }) {
    this.originalInput = originalInput;
    this.extractedClaim = refinedClaim || '';
    this.metadata = {
      inputType: 'text',
      evidenceRound: 0,
      maxEvidenceRounds: 3,
      confidenceThreshold: 75,
      ...metadata,
    };

    this.plan = null;
    this.content = null;
    this.evidence = [];
    this.credibility = [];
    this.reasoning = null;
    this.verification = null;
    this.report = null;
    this.confidence = 0;
    this.visitedTools = [];
    this.executionHistory = [];
    this.errors = [];
    this.retries = {};
    this.agentOutputs = {};
    this.timings = {
      agents: {},
      tools: {},
      totalMs: 0,
      factCheckMs: 0,
      newsSearchMs: 0,
      webSearchMs: 0,
      credibilityMs: 0,
      llmAnalysisMs: 0,
    };

    this.startedAt = new Date().toISOString();
    this.endedAt = null;
    this._timer = startTimer();
  }

  setPlan(plan) {
    this.plan = plan;
    this.agentOutputs.planner = plan;
  }

  setContent(content) {
    this.content = content;
    this.extractedClaim = content?.mainClaim || this.extractedClaim;
    this.agentOutputs.content = content;
  }

  addEvidence(items = []) {
    items.forEach(item => {
      this.evidence.push(item);
      if (item.toolName && !this.visitedTools.includes(item.toolName)) {
        this.visitedTools.push(item.toolName);
      }
    });
  }

  setCredibility(credibility) {
    this.credibility = credibility;
    this.agentOutputs.credibility = credibility;
  }

  setReasoning(reasoning) {
    this.reasoning = reasoning;
    this.confidence = Number(reasoning?.confidence || 0);
    this.agentOutputs.reasoning = reasoning;
  }

  setVerification(verification) {
    this.verification = verification;
    this.agentOutputs.verification = verification;
  }

  setReport(report) {
    this.report = report;
    this.agentOutputs.report = report;
  }

  incrementEvidenceRound() {
    this.metadata.evidenceRound += 1;
  }

  incrementRetry(key) {
    this.retries[key] = (this.retries[key] || 0) + 1;
  }

  addError(error, context = {}) {
    const normalizedError = {
      message: error?.message || String(error),
      name: error?.name || 'Error',
      context,
      timestamp: new Date().toISOString(),
    };
    this.errors.push(normalizedError);
    return normalizedError;
  }

  addHistory(entry) {
    this.executionHistory.push({
      timestamp: new Date().toISOString(),
      ...this._toSerializableSnapshot(entry),
    });
  }

  addAgentTiming(agentName, durationMs) {
    this.timings.agents[agentName] = Number(((this.timings.agents[agentName] || 0) + durationMs).toFixed(2));
  }

  addToolTiming(toolName, durationMs) {
    this.timings.tools[toolName] = Number(((this.timings.tools[toolName] || 0) + durationMs).toFixed(2));

    const normalized = String(toolName || '').toLowerCase();
    if (normalized.includes('factcheck')) {
      this.timings.factCheckMs += durationMs;
    } else if (normalized.includes('news')) {
      this.timings.newsSearchMs += durationMs;
    } else if (normalized.includes('web')) {
      this.timings.webSearchMs += durationMs;
    } else if (normalized.includes('credibility')) {
      this.timings.credibilityMs += durationMs;
    }
  }

  addLlmTiming(durationMs) {
    this.timings.llmAnalysisMs += durationMs;
  }

  finish() {
    this.endedAt = new Date().toISOString();
    this.timings.totalMs = stopTimer(this._timer);
  }

  getTimingSummary() {
    return {
      factCheckMs: Number(this.timings.factCheckMs.toFixed(2)),
      newsSearchMs: Number(this.timings.newsSearchMs.toFixed(2)),
      webSearchMs: Number(this.timings.webSearchMs.toFixed(2)),
      credibilityMs: Number(this.timings.credibilityMs.toFixed(2)),
      llmAnalysisMs: Number(this.timings.llmAnalysisMs.toFixed(2)),
      totalMs: Number(this.timings.totalMs.toFixed(2)),
      agents: this.timings.agents,
      tools: this.timings.tools,
    };
  }

  getExecutionMetadata() {
    return {
      originalInput: this.originalInput,
      extractedClaim: this.extractedClaim,
      inputType: this.plan?.inputType,
      contentType: this.plan?.contentType,
      visitedTools: [...this.visitedTools],
      executionHistory: this.getExecutionHistorySnapshot(),
      errors: this._toSerializableSnapshot(this.errors),
      retries: { ...this.retries },
      timings: this.getTimingSummary(),
      totalExecutionTime: this.timings.totalMs,
      totalAgents: Object.keys(this.timings.agents).length,
      evidenceRounds: this.metadata.evidenceRound,
      agentTimings: { ...this.timings.agents },
      confidence: this.confidence,
      confidenceThreshold: this.metadata.confidenceThreshold,
      completedAgents: Object.keys(this.agentOutputs),
    };
  }

  getExecutionHistorySnapshot() {
    return this.executionHistory.map(entry => this._toSerializableSnapshot(entry));
  }

  getAgentOutputsSnapshot() {
    return this._toSerializableSnapshot(this.agentOutputs);
  }

  toJSON() {
    return {
      originalInput: this.originalInput,
      extractedClaim: this.extractedClaim,
      plan: this.plan,
      content: this.content,
      evidence: this.evidence,
      credibility: this.credibility,
      reasoning: this.reasoning,
      verification: this.verification,
      report: this._toSerializableSnapshot(this.report),
      confidence: this.confidence,
      visitedTools: this.visitedTools,
      executionHistory: this.getExecutionHistorySnapshot(),
      executionTime: {
        startedAt: this.startedAt,
        endedAt: this.endedAt,
        durationMs: this.timings.totalMs,
      },
      errors: this._toSerializableSnapshot(this.errors),
      retries: this.retries,
      agentOutputs: this.getAgentOutputsSnapshot(),
      timings: this.getTimingSummary(),
      metadata: this.metadata,
    };
  }

  _toSerializableSnapshot(value, seen = new WeakSet()) {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'object') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (seen.has(value)) {
      return '[Circular Reference Removed]';
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const snapshot = value.map(item => this._toSerializableSnapshot(item, seen));
      seen.delete(value);
      return snapshot;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    const snapshot = {};
    Object.entries(value).forEach(([key, item]) => {
      if (key === '_timer') {
        return;
      }
      snapshot[key] = this._toSerializableSnapshot(item, seen);
    });

    seen.delete(value);
    return snapshot;
  }
}

export default WorkflowState;
