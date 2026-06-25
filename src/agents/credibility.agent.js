import { startTimer, stopTimer } from '../utils/timer.js';

class SourceCredibilityAgent {
  constructor({ toolRegistry }) {
    this.name = 'credibility';
    this.toolRegistry = toolRegistry;
  }

  async execute(state) {
    const tool = this.toolRegistry.get('domainCredibility');
    const urls = this._extractUrls(state.evidence);

    if (!tool || urls.length === 0) {
      return [];
    }

    const scores = [];
    for (const url of urls) {
      const timer = startTimer();
      try {
        const result = await tool.execute(url);
        const durationMs = stopTimer(timer);
        state.addToolTiming('domainCredibility', durationMs);
        const score = {
          domain: result.domain,
          url,
          trustScore: result.trustScore ?? result.score ?? 0,
          reason: result.reason || (result.reasoning || []).join(' '),
          reliability: result.reliability || 'unknown',
          officialSource: Boolean(result.officialSource),
          historicalConfidence: result.historicalConfidence ?? result.score ?? 0,
        };
        scores.push(score);
        this._applyCredibilityScore(state.evidence, url, score.trustScore);
      } catch (error) {
        const durationMs = stopTimer(timer);
        state.addToolTiming('domainCredibility', durationMs);
        state.addError(error, { toolName: 'domainCredibility', input: url });
      }
    }

    return scores;
  }

  _extractUrls(evidence) {
    const urls = new Set();

    evidence.forEach(item => {
      this._walk(item.result, value => {
        if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
          urls.add(value);
        }
      });
    });

    return Array.from(urls).slice(0, 12);
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

  _applyCredibilityScore(evidenceList, url, trustScore) {
    const normalizedUrl = this._normalizeUrl(url);

    evidenceList.forEach(item => {
      this._walk(item.result, value => {
        if (!value || typeof value !== 'object' || typeof value.url !== 'string') {
          return;
        }

        if (this._normalizeUrl(value.url) === normalizedUrl) {
          value.credibilityScore = trustScore;
        }
      });
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
}

export default SourceCredibilityAgent;
