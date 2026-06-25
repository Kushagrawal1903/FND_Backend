import logger from '../../utils/logger.js';

/**
 * Source Reputation Tool
 * Deterministic domain reputation lookup against a curated dataset.
 * No LLM required — pure data lookup with caching.
 */

/**
 * Curated source reputation database.
 * Scores are 0-100 where 100 = most trusted.
 * This can be extended or loaded from a JSON file / database in the future.
 */
const REPUTATION_DB = {
  // Major trusted news outlets
  'reuters.com':        { score: 95, category: 'wire_service' },
  'apnews.com':         { score: 95, category: 'wire_service' },
  'bbc.com':            { score: 90, category: 'public_broadcaster' },
  'bbc.co.uk':          { score: 90, category: 'public_broadcaster' },
  'nytimes.com':        { score: 88, category: 'major_newspaper' },
  'washingtonpost.com': { score: 87, category: 'major_newspaper' },
  'theguardian.com':    { score: 85, category: 'major_newspaper' },
  'wsj.com':            { score: 88, category: 'major_newspaper' },
  'npr.org':            { score: 88, category: 'public_broadcaster' },
  'pbs.org':            { score: 88, category: 'public_broadcaster' },
  'economist.com':      { score: 87, category: 'magazine' },
  'nature.com':         { score: 95, category: 'scientific_journal' },
  'science.org':        { score: 95, category: 'scientific_journal' },
  'who.int':            { score: 93, category: 'international_org' },
  'cdc.gov':            { score: 92, category: 'government' },
  'nih.gov':            { score: 92, category: 'government' },

  // Fact-checking organizations
  'snopes.com':         { score: 88, category: 'fact_checker' },
  'politifact.com':     { score: 87, category: 'fact_checker' },
  'factcheck.org':      { score: 88, category: 'fact_checker' },
  'fullfact.org':       { score: 86, category: 'fact_checker' },

  // Mixed/opinion-heavy outlets
  'foxnews.com':        { score: 55, category: 'cable_news' },
  'cnn.com':            { score: 65, category: 'cable_news' },
  'msnbc.com':          { score: 60, category: 'cable_news' },
  'huffpost.com':       { score: 55, category: 'online_news' },
  'breitbart.com':      { score: 25, category: 'partisan' },
  'dailymail.co.uk':    { score: 35, category: 'tabloid' },
  'buzzfeed.com':       { score: 45, category: 'online_news' },
  'vice.com':           { score: 55, category: 'online_news' },

  // Known misinformation sources
  'infowars.com':       { score: 5,  category: 'conspiracy' },
  'naturalnews.com':    { score: 8,  category: 'pseudoscience' },
};

/** Cache for already-looked-up domains */
const _domainCache = new Map();

class SourceReputationTool {
  /**
   * Look up the reputation of a source by URL or domain name.
   * @param {string} urlOrDomain - Full URL or bare domain
   * @returns {{ sourceName: string, trustScore: number, category: string, explanation: string }}
   */
  lookup(urlOrDomain) {
    if (!urlOrDomain) {
      return this._unknownResult('unknown');
    }

    const domain = this._extractDomain(urlOrDomain);

    // Check cache first
    if (_domainCache.has(domain)) {
      return _domainCache.get(domain);
    }

    // Try exact match, then try without 'www.'
    const entry = REPUTATION_DB[domain]
      || REPUTATION_DB[domain.replace(/^www\./, '')]
      || null;

    let result;
    if (entry) {
      result = {
        sourceName: domain,
        trustScore: entry.score,
        category: entry.category,
        explanation: this._buildExplanation(domain, entry),
      };
    } else {
      result = this._unknownResult(domain);
    }

    _domainCache.set(domain, result);
    return result;
  }

  /**
   * Extract the domain from a URL string.
   * Handles both full URLs and bare domain names.
   */
  _extractDomain(input) {
    try {
      // If it looks like a URL, parse it
      if (input.includes('://') || input.includes('www.')) {
        const url = new URL(input.startsWith('http') ? input : `https://${input}`);
        return url.hostname.replace(/^www\./, '');
      }
      return input.toLowerCase().trim();
    } catch {
      return input.toLowerCase().trim();
    }
  }

  _unknownResult(domain) {
    return {
      sourceName: domain,
      trustScore: 50, // Neutral default for unknown sources
      category: 'unknown',
      explanation: `Source "${domain}" is not in our reputation database. A neutral trust score of 50 has been assigned. Manual verification is recommended.`,
    };
  }

  _buildExplanation(domain, entry) {
    if (entry.score >= 85) {
      return `"${domain}" is a highly reputable ${entry.category.replace(/_/g, ' ')} source with a trust score of ${entry.score}/100.`;
    }
    if (entry.score >= 60) {
      return `"${domain}" is a moderately trusted ${entry.category.replace(/_/g, ' ')} source (${entry.score}/100). Content may contain editorial bias.`;
    }
    if (entry.score >= 30) {
      return `"${domain}" is a low-trust ${entry.category.replace(/_/g, ' ')} source (${entry.score}/100). Content should be cross-referenced.`;
    }
    return `"${domain}" is a very low-trust ${entry.category.replace(/_/g, ' ')} source (${entry.score}/100). High risk of misinformation.`;
  }
}

export default new SourceReputationTool();
