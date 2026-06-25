import { startTimer, stopTimer } from '../utils/timer.js';
import logger from '../utils/logger.js';

class EvidenceRetrievalAgent {
  constructor({ toolRegistry, maxToolRetries = 1 }) {
    this.name = 'evidence';
    this.toolRegistry = toolRegistry;
    this.maxToolRetries = maxToolRetries;
  }

  async execute(state, options = {}) {
    const executionPlan = this._resolveExecutionPlan(state, options);
    const query = this._buildQuery(state, options);
    const collected = [];
    const seenUrls = this._collectSeenUrls(state.evidence);

    logger.info('[EVIDENCE AGENT] Execution Plan', executionPlan);
    logger.info('[EVIDENCE AGENT] Planner Selected Tools', executionPlan.map(step => step.provider));

    for (const step of executionPlan) {
      const providerName = step.provider;
      const duplicate = state.evidence.some(
        item => item.toolName === providerName && item.input.trim().toLowerCase() === query.trim().toLowerCase()
      );

      if (duplicate) {
        logger.info('[EVIDENCE AGENT] Skipped Tool', {
          tool: providerName,
          reason: 'Duplicate tool/query pair already executed.',
          query,
        });
        continue;
      }

      const evidence = await this._executeTool(providerName, query, state, step);
      this._dedupeEvidenceUrls(evidence, seenUrls);
      collected.push(evidence);
    }

    return {
      query,
      evidence: collected,
      providersUsed: collected.map(item => item.toolName),
    };
  }

  async _executeTool(toolName, input, state, step = {}) {
    const tool = this.toolRegistry.get(toolName);
    const startedAt = new Date().toISOString();
    const historyBase = { type: 'tool', toolName, input, startedAt, planStep: step };

    if (!tool) {
      const error = new Error(`Tool "${toolName}" is not registered.`);
      state.addError(error, { toolName, input });
      logger.warn('[EVIDENCE AGENT] Skipped Tool', {
        tool: toolName,
        reason: error.message,
      });
      return {
        toolName,
        provider: this._getProviderName(toolName),
        source: toolName,
        url: '',
        title: input,
        publishedAt: null,
        credibilityScore: null,
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
        logger.info('[EVIDENCE AGENT] Executing Tool', {
          tool: toolName,
          query: input,
          attempt: attempt + 1,
          reason: step.reason || 'Selected by planner.',
        });
        if (toolName === 'gnews') {
          console.log(`[GNEWS TOOL] Searching for: "${input}"`);
        }
        const result = await tool.execute(input);
        const durationMs = stopTimer(timer);
        state.addToolTiming(toolName, durationMs);

        lastResult = result;
        if (!result?.error || result?.skipped) {
          const endedAt = new Date().toISOString();
          const normalizedResult = this._normalizeToolResult(toolName, result);
          state.addHistory({ ...historyBase, endedAt, durationMs, retries: attempt, output: normalizedResult });

          if (result?.skipped) {
            logger.info('[EVIDENCE AGENT] Skipped Tool', {
              tool: toolName,
              reason: result.reason || 'Tool reported skipped.',
              durationMs,
            });
          } else {
            logger.info('[EVIDENCE AGENT] Completed Tool', {
              tool: toolName,
              durationMs,
              resultCount: normalizedResult.totalResults ?? normalizedResult.claimCount ?? normalizedResult.evidenceItems?.length ?? 0,
            });
          }

          return {
            toolName,
            provider: this._getProviderName(toolName),
            source: toolName,
            url: '',
            title: input,
            publishedAt: null,
            credibilityScore: null,
            input,
            result: normalizedResult,
            startedAt,
            endedAt,
            durationMs,
            retries: attempt,
          };
        }

        lastError = new Error(result.error);
      } catch (error) {
        const durationMs = stopTimer(timer);
        state.addToolTiming(toolName, durationMs);
        lastError = error;
        logger.warn('[EVIDENCE AGENT] Skipped Tool', {
          tool: toolName,
          reason: error.message,
          attempt: attempt + 1,
        });
      }
    }

    const normalizedError = state.addError(lastError, { toolName, input });
    const endedAt = new Date().toISOString();
    const output = lastResult || { error: normalizedError.message };
    state.addHistory({ ...historyBase, endedAt, retries: this.maxToolRetries, output, errors: [normalizedError] });

    return {
      toolName,
      provider: this._getProviderName(toolName),
      source: toolName,
      url: '',
      title: input,
      publishedAt: null,
      credibilityScore: null,
      input,
      result: this._normalizeToolResult(toolName, output),
      startedAt,
      endedAt,
      durationMs: 0,
      retries: this.maxToolRetries,
      error: normalizedError.message,
    };
  }

  _resolveExecutionPlan(state, options) {
    if (Array.isArray(options.executionPlan) && options.executionPlan.length > 0) {
      return this._normalizeExecutionPlan(options.executionPlan);
    }

    if (Array.isArray(state.verification?.requestedExecutionPlan) && state.verification.requestedExecutionPlan.length > 0) {
      return this._normalizeExecutionPlan(state.verification.requestedExecutionPlan);
    }

    if (Array.isArray(options.providers) && options.providers.length > 0) {
      return this._providersToExecutionPlan(options.providers);
    }

    if (Array.isArray(state.verification?.requestedProviders) && state.verification.requestedProviders.length > 0) {
      return this._providersToExecutionPlan(state.verification.requestedProviders);
    }

    if (Array.isArray(state.plan?.executionPlan) && state.plan.executionPlan.length > 0) {
      return this._normalizeExecutionPlan(state.plan.executionPlan);
    }

    return this._providersToExecutionPlan(state.plan?.tools || state.plan?.evidenceProviders || []);
  }

  _normalizeExecutionPlan(executionPlan) {
    return executionPlan
      .filter(step => step?.provider)
      .map((step, index) => ({
        order: Number(step.order || index + 1),
        provider: step.provider,
        reason: step.reason || 'Selected by planner.',
      }))
      .sort((a, b) => a.order - b.order);
  }

  _providersToExecutionPlan(providers = []) {
    return providers.map((provider, index) => ({
      order: index + 1,
      provider,
      reason: 'Selected by planner.',
    }));
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

  _normalizeToolResult(toolName, result) {
    const normalized = { ...result };
    const provider = this._getProviderName(toolName);

    if (Array.isArray(normalized.results)) {
      normalized.results = normalized.results.map(item => this._normalizeArticleLikeEvidence(item, provider));
      normalized.totalResults = normalized.results.length;
    }

    normalized.evidenceItems = this._extractEvidenceItems(normalized, provider);
    return normalized;
  }

  _normalizeArticleLikeEvidence(item, provider) {
    const url = item.url || '';
    return {
      title: item.title || item.name || '',
      description: item.description || item.snippet || item.content || '',
      url,
      source: item.source || item.publisher || this._hostname(url),
      publishedAt: item.publishedAt || item.published_at || null,
      image: item.image || '',
      content: item.content || item.snippet || item.description || '',
      provider,
      credibilityScore: item.credibilityScore ?? null,
      evidenceType: item.evidenceType || (provider === 'gnews' ? 'news_article' : 'web_result'),
      score: item.score,
      snippet: item.snippet || item.description || item.content || '',
    };
  }

  _extractEvidenceItems(result, provider) {
    const items = [];

    if (Array.isArray(result.results)) {
      result.results.forEach(item => items.push(this._normalizeArticleLikeEvidence(item, provider)));
    }

    if (Array.isArray(result.claims)) {
      result.claims.forEach(claim => {
        (claim.reviews || []).forEach(review => {
          const url = review.url || '';
          items.push({
            title: review.title || claim.text || '',
            description: claim.text || review.rating || '',
            url,
            source: review.publisher || this._hostname(url),
            publishedAt: null,
            image: '',
            content: claim.text || '',
            provider,
            credibilityScore: null,
            evidenceType: 'fact_check_review',
            verdict: review.rating || 'Unrated',
          });
        });
      });
    }

    return this._dedupeItems(items);
  }

  _dedupeEvidenceUrls(evidence, seenUrls) {
    if (!evidence?.result) return;

    let allowedCurrentUrls = null;
    if (Array.isArray(evidence.result.results)) {
      evidence.result.results = evidence.result.results.filter(item => this._markUrlIfNew(item.url, seenUrls));
      evidence.result.totalResults = evidence.result.results.length;
      allowedCurrentUrls = new Set(evidence.result.results.map(item => this._normalizeUrl(item.url)).filter(Boolean));
    }

    if (Array.isArray(evidence.result.evidenceItems)) {
      evidence.result.evidenceItems = evidence.result.evidenceItems.filter(item => {
        if (!item.url || !allowedCurrentUrls) return true;
        return allowedCurrentUrls.has(this._normalizeUrl(item.url));
      });
    }
  }

  _collectSeenUrls(evidenceList) {
    const seenUrls = new Set();
    evidenceList.forEach(item => {
      this._extractUrls(item.result).forEach(url => seenUrls.add(url));
    });
    return seenUrls;
  }

  _extractUrls(value) {
    const urls = [];
    this._walk(value, item => {
      if (item && typeof item === 'object' && typeof item.url === 'string' && item.url) {
        urls.push(this._normalizeUrl(item.url));
      }
    });
    return urls.filter(Boolean);
  }

  _markUrlIfNew(url, seenUrls, addIfNew = true) {
    if (!url) return true;
    const normalized = this._normalizeUrl(url);
    if (!normalized) return true;
    if (seenUrls.has(normalized)) return false;
    if (addIfNew) seenUrls.add(normalized);
    return true;
  }

  _dedupeItems(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.url ? this._normalizeUrl(item.url) : `${item.provider}:${item.title}`;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  _normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      return parsed.toString().replace(/\/$/, '').toLowerCase();
    } catch (error) {
      return String(url || '').trim().replace(/\/$/, '').toLowerCase();
    }
  }

  _hostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return '';
    }
  }

  _walk(value, visitor) {
    visitor(value);
    if (Array.isArray(value)) {
      value.forEach(item => this._walk(item, visitor));
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(item => this._walk(item, visitor));
    }
  }

  _getProviderName(toolName) {
    if (toolName === 'webSearch') return 'tavily';
    if (toolName === 'googleFactCheck') return 'google_fact_check';
    return toolName;
  }
}

export default EvidenceRetrievalAgent;
