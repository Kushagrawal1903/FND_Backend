import { startTimer, stopTimer } from '../utils/timer.js';

class EvidenceRetrievalAgent {
  constructor({ toolRegistry, maxToolRetries = 1 }) {
    this.name = 'evidence';
    this.toolRegistry = toolRegistry;
    this.maxToolRetries = maxToolRetries;
  }

  async execute(state, options = {}) {
    const providers = options.providers || state.verification?.requestedProviders || state.plan?.evidenceProviders || [];
    const query = this._buildQuery(state, options);
    const collected = [];

    for (const providerName of providers) {
      const duplicate = state.evidence.some(
        item => item.toolName === providerName && item.input.trim().toLowerCase() === query.trim().toLowerCase()
      );

      if (duplicate) {
        continue;
      }

      const evidence = await this._executeTool(providerName, query, state);
      collected.push(evidence);
    }

    return {
      query,
      evidence: collected,
      providersUsed: collected.map(item => item.toolName),
    };
  }

  async _executeTool(toolName, input, state) {
    const tool = this.toolRegistry.get(toolName);
    const startedAt = new Date().toISOString();
    const historyBase = { type: 'tool', toolName, input, startedAt };

    if (!tool) {
      const error = new Error(`Tool "${toolName}" is not registered.`);
      state.addError(error, { toolName, input });
      return {
        toolName,
        input,
        result: { error: error.message },
        startedAt,
        endedAt: new Date().toISOString(),
        durationMs: 0,
      };
    }

    let lastResult = null;
    let lastError = null;

    for (let attempt = 0; attempt <= this.maxToolRetries; attempt += 1) {
      if (attempt > 0) {
        state.incrementRetry(`tool:${toolName}`);
      }

      const timer = startTimer();
      try {
        const result = await tool.execute(input);
        const durationMs = stopTimer(timer);
        state.addToolTiming(toolName, durationMs);

        lastResult = result;
        if (!result?.error) {
          const endedAt = new Date().toISOString();
          state.addHistory({ ...historyBase, endedAt, durationMs, retries: attempt, output: result });
          return { toolName, input, result, startedAt, endedAt, durationMs, retries: attempt };
        }

        lastError = new Error(result.error);
      } catch (error) {
        const durationMs = stopTimer(timer);
        state.addToolTiming(toolName, durationMs);
        lastError = error;
      }
    }

    const normalizedError = state.addError(lastError, { toolName, input });
    const endedAt = new Date().toISOString();
    const output = lastResult || { error: normalizedError.message };
    state.addHistory({ ...historyBase, endedAt, retries: this.maxToolRetries, output, errors: [normalizedError] });

    return {
      toolName,
      input,
      result: output,
      startedAt,
      endedAt,
      durationMs: 0,
      retries: this.maxToolRetries,
      error: normalizedError.message,
    };
  }

  _buildQuery(state, options) {
    if (options.query) return options.query;

    const mainClaim = state.content?.mainClaim || state.extractedClaim || state.originalInput;
    if (state.metadata.evidenceRound <= 1) {
      return mainClaim;
    }

    const keywords = state.content?.keywords || [];
    return [mainClaim, ...keywords.slice(0, 3)].filter(Boolean).join(' ');
  }
}

export default EvidenceRetrievalAgent;
