import logger from './logger.js';

const DEFAULT_PROVIDER_LIMITS = Object.freeze({
  google_fact_check: 3,
  tavily: 3,
  gnews: 3,
});

const DESCRIPTION_LIMIT = 300;

class EvidencePreparer {
  prepare({ claim, evidence = [], credibility = [], maxPromptTokens = 6000, providerLimits = DEFAULT_PROVIDER_LIMITS }) {
    const credibilityByUrl = this._mapCredibilityByUrl(credibility);
    const extractedItems = this._extractItems(evidence, credibilityByUrl);
    const originalEvidenceCount = extractedItems.length;
    const dedupedItems = this._dedupe(extractedItems);
    const rankedItems = dedupedItems
      .map(item => this._rankItem(item, claim))
      .sort((a, b) => b.rankScore - a.rankScore);

    const limitedByProvider = this._limitByProvider(rankedItems, providerLimits);
    const initialTokenEstimate = this._estimatePromptTokens(claim, limitedByProvider, credibility);
    const finalItems = this._fitTokenBudget(limitedByProvider, claim, credibility, maxPromptTokens);
    const finalTokenEstimate = this._estimatePromptTokens(claim, finalItems, credibility);
    const relevantCredibility = this._filterCredibilityForItems(credibility, finalItems);

    logger.info('[EVIDENCE PREP] Evidence compacted for reasoning', {
      originalEvidenceCount,
      filteredEvidenceCount: finalItems.length,
      estimatedPromptSize: initialTokenEstimate,
      finalTokenEstimate,
      maxPromptTokens,
    });

    return {
      items: finalItems,
      sourceCredibility: relevantCredibility,
      stats: {
        originalEvidenceCount,
        dedupedEvidenceCount: dedupedItems.length,
        filteredEvidenceCount: finalItems.length,
        estimatedPromptSize: initialTokenEstimate,
        finalTokenEstimate,
        maxPromptTokens,
        providerLimits,
      },
    };
  }

  _extractItems(evidence, credibilityByUrl) {
    const items = [];

    evidence.forEach(entry => {
      const provider = entry.provider || this._providerFromToolName(entry.toolName);
      const result = entry.result || {};

      if (Array.isArray(result.evidenceItems)) {
        result.evidenceItems.forEach(item => items.push(this._compactItem(item, provider, credibilityByUrl)));
      }

      if (Array.isArray(result.results)) {
        result.results.forEach(item => items.push(this._compactItem(item, provider, credibilityByUrl)));
      }

      if (Array.isArray(result.claims)) {
        result.claims.forEach(claim => {
          (claim.reviews || []).forEach(review => {
            items.push(this._compactItem({
              title: review.title || claim.text,
              description: claim.text || review.rating,
              url: review.url,
              source: review.publisher,
              publishedAt: null,
              provider,
              evidenceType: 'fact_check_review',
              verdict: review.rating,
            }, provider, credibilityByUrl));
          });
        });
      }

      (result.credibility?.sources || []).forEach(source => {
        items.push(this._compactItem({
          title: source.publisher,
          description: source.verdict,
          url: source.url,
          source: source.publisher,
          publishedAt: null,
          provider,
          evidenceType: 'fact_check_source',
          verdict: source.verdict,
        }, provider, credibilityByUrl));
      });
    });

    return items.filter(item => item.title || item.url || item.description);
  }

  _compactItem(item, provider, credibilityByUrl) {
    const url = item.url || '';
    const credibility = credibilityByUrl.get(this._normalizeUrl(url));
    const credibilityScore = item.credibilityScore ?? credibility?.trustScore ?? credibility?.score ?? 0;

    return {
      title: this._cleanText(item.title),
      source: this._cleanText(item.source || item.publisher || this._hostname(url)),
      url,
      publishedAt: item.publishedAt || null,
      credibilityScore,
      description: this._truncate(item.description || item.snippet || item.content || '', DESCRIPTION_LIMIT),
      provider: item.provider || provider,
      evidenceType: item.evidenceType || 'evidence',
      officialSource: Boolean(item.officialSource || credibility?.officialSource),
      reliability: credibility?.reliability || item.reliability || 'unknown',
      verdict: item.verdict || item.rating || undefined,
    };
  }

  _dedupe(items) {
    const seenUrls = new Set();
    const seenTitles = new Set();
    const deduped = [];

    items.forEach(item => {
      const normalizedUrl = this._normalizeUrl(item.url);
      const normalizedTitle = this._normalizeTitle(item.title);

      if (normalizedUrl && seenUrls.has(normalizedUrl)) {
        return;
      }

      if (normalizedTitle && seenTitles.has(normalizedTitle)) {
        return;
      }

      if (normalizedUrl) seenUrls.add(normalizedUrl);
      if (normalizedTitle) seenTitles.add(normalizedTitle);
      deduped.push(item);
    });

    return deduped;
  }

  _rankItem(item, claim) {
    const credibilityScore = Number(item.credibilityScore || 0);
    const similarityScore = this._semanticSimilarity(claim, `${item.title} ${item.description}`);
    const recencyScore = this._publicationDateScore(item.publishedAt);
    const officialSourceScore = item.officialSource ? 100 : 0;

    return {
      ...item,
      rankScore: Number((
        credibilityScore * 0.4 +
        similarityScore * 0.3 +
        recencyScore * 0.2 +
        officialSourceScore * 0.1
      ).toFixed(2)),
      rankSignals: {
        credibilityScore,
        semanticSimilarity: similarityScore,
        publicationDateScore: recencyScore,
        officialSourcePriority: officialSourceScore,
      },
    };
  }

  _limitByProvider(items, providerLimits) {
    const counts = {};
    return items.filter(item => {
      const provider = item.provider || 'unknown';
      const limit = providerLimits[provider] ?? 3;
      counts[provider] = counts[provider] || 0;
      if (counts[provider] >= limit) {
        return false;
      }
      counts[provider] += 1;
      return true;
    });
  }

  _fitTokenBudget(items, claim, credibility, maxPromptTokens) {
    const fitted = [...items];
    while (fitted.length > 1 && this._estimatePromptTokens(claim, fitted, credibility) > maxPromptTokens) {
      fitted.pop();
    }

    if (fitted.length > 0 && this._estimatePromptTokens(claim, fitted, credibility) > maxPromptTokens) {
      fitted[0] = {
        ...fitted[0],
        description: this._truncate(fitted[0].description, 120),
      };
    }

    if (fitted.length > 0 && this._estimatePromptTokens(claim, fitted, credibility) > maxPromptTokens) {
      fitted[0] = {
        ...fitted[0],
        description: '',
      };
    }

    return fitted;
  }

  _filterCredibilityForItems(credibility, items) {
    const urls = new Set(items.map(item => this._normalizeUrl(item.url)).filter(Boolean));
    return credibility
      .filter(item => urls.has(this._normalizeUrl(item.url)))
      .map(item => ({
        domain: item.domain,
        url: item.url,
        trustScore: item.trustScore,
        reliability: item.reliability,
        officialSource: item.officialSource,
        historicalConfidence: item.historicalConfidence,
      }));
  }

  _estimatePromptTokens(claim, items, credibility) {
    const payload = {
      claim,
      evidence: items,
      sourceCredibility: this._filterCredibilityForItems(credibility, items),
    };
    const promptOverheadTokens = 800;
    return Math.ceil(JSON.stringify(payload).length / 4) + promptOverheadTokens;
  }

  _semanticSimilarity(claim, text) {
    const claimTerms = this._tokenSet(claim);
    const textTerms = this._tokenSet(text);

    if (claimTerms.size === 0 || textTerms.size === 0) {
      return 0;
    }

    let intersection = 0;
    claimTerms.forEach(term => {
      if (textTerms.has(term)) intersection += 1;
    });

    const union = new Set([...claimTerms, ...textTerms]).size;
    return Math.round((intersection / union) * 100);
  }

  _publicationDateScore(publishedAt) {
    if (!publishedAt) {
      return 20;
    }

    const timestamp = new Date(publishedAt).getTime();
    if (Number.isNaN(timestamp)) {
      return 20;
    }

    const ageDays = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (ageDays <= 2) return 100;
    if (ageDays <= 7) return 85;
    if (ageDays <= 30) return 70;
    if (ageDays <= 180) return 45;
    if (ageDays <= 365) return 30;
    return 15;
  }

  _tokenSet(text) {
    const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'was', 'were', 'are', 'about', 'into', 'your']);
    return new Set(
      String(text || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
    );
  }

  _providerFromToolName(toolName) {
    if (toolName === 'googleFactCheck') return 'google_fact_check';
    if (toolName === 'webSearch') return 'tavily';
    return toolName || 'unknown';
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

  _normalizeTitle(title) {
    return String(title || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  _hostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return '';
    }
  }

  _cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  _truncate(text, limit) {
    const cleaned = this._cleanText(text);
    if (cleaned.length <= limit) {
      return cleaned;
    }
    return `${cleaned.slice(0, limit - 3)}...`;
  }

  _mapCredibilityByUrl(credibility) {
    const map = new Map();
    credibility.forEach(item => {
      const key = this._normalizeUrl(item.url);
      if (key) map.set(key, item);
    });
    return map;
  }
}

export default new EvidencePreparer();
