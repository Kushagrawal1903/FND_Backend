/**
 * SourceCredibilityTool
 *
 * Deterministically evaluates the credibility of a URL or domain. The scoring
 * weights and trusted domain lists are configurable through the constructor, so
 * future source policies can change without touching agent code.
 */

export const DEFAULT_SOURCE_CREDIBILITY_CONFIG = Object.freeze({
  baseScore: 50,
  weights: {
    https: 15,
    noHttps: -5,
    reputableDomain: 30,
    factCheckDomain: 25,
    governmentDomain: 25,
    educationalDomain: 20,
    organizationDomain: 5,
    suspiciousTld: -15,
    shortDomain: -10,
    excessiveHyphens: -10,
    numericHeavyDomain: -10,
  },
  reputableDomains: [
    'reuters.com', 'apnews.com', 'afp.com',
    'nytimes.com', 'washingtonpost.com', 'wsj.com', 'usatoday.com',
    'npr.org', 'pbs.org', 'abcnews.go.com', 'cbsnews.com', 'nbcnews.com',
    'cnn.com', 'foxnews.com', 'msnbc.com', 'bbc.com', 'bbc.co.uk',
    'theguardian.com', 'economist.com', 'ft.com', 'aljazeera.com',
    'dw.com', 'france24.com', 'abc.net.au', 'cbc.ca',
    'thehindu.com', 'indianexpress.com', 'ndtv.com', 'hindustantimes.com',
    'timesofindia.indiatimes.com', 'livemint.com',
    'nature.com', 'sciencemag.org', 'thelancet.com', 'nejm.org',
    'scientificamerican.com', 'wired.com', 'techcrunch.com',
  ],
  factCheckDomains: [
    'politifact.com', 'snopes.com', 'factcheck.org', 'fullfact.org',
    'altnews.in', 'boomlive.in', 'vishvasnews.com', 'thequint.com',
    'checkyourfact.com', 'leadstories.com',
  ],
  suspiciousTlds: [
    '.xyz', '.top', '.buzz', '.click', '.link', '.win', '.gq', '.cf',
    '.tk', '.ml', '.ga', '.info', '.biz', '.pw', '.cc',
  ],
});

const mergeConfig = (config = {}) => ({
  ...DEFAULT_SOURCE_CREDIBILITY_CONFIG,
  ...config,
  weights: {
    ...DEFAULT_SOURCE_CREDIBILITY_CONFIG.weights,
    ...(config.weights || {}),
  },
});

class SourceCredibilityTool {
  constructor(config = {}) {
    this.name = 'SourceCredibilityTool';
    this.description = 'Evaluates the credibility of a source URL or domain. Checks HTTPS, known reputable outlets, official domains, and suspicious indicators. Returns a 0-100 credibility score with detailed reasoning.';
    this.config = mergeConfig(config);
    this.reputableDomains = new Set(this.config.reputableDomains);
    this.factCheckDomains = new Set(this.config.factCheckDomains);
    this.suspiciousTlds = new Set(this.config.suspiciousTlds);
  }

  /**
   * Execute the source credibility evaluation.
   * @param {string} input - A URL or domain name to evaluate.
   * @returns {Promise<Object>}
   */
  async execute(input) {
    console.log(`[SOURCE CREDIBILITY TOOL] Evaluating: "${input}"`);

    const reasoning = [];
    const { weights } = this.config;
    let score = this.config.baseScore;
    let domain = '';
    let isHttps = false;

    try {
      const urlString = input.includes('://') ? input : `https://${input}`;
      const parsed = new URL(urlString);
      domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
      isHttps = parsed.protocol === 'https:';
    } catch (error) {
      domain = String(input || '').replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    }

    if (!domain) {
      return {
        score: 0,
        trustScore: 0,
        reasoning: ['Could not parse a valid domain from the input.'],
        reason: 'Could not parse a valid domain from the input.',
        domain: input,
        reliability: 'unknown',
        officialSource: false,
        historicalConfidence: 0,
        isReputable: false,
      };
    }

    if (isHttps) {
      score += weights.https;
      reasoning.push(`Source uses HTTPS (${this._formatDelta(weights.https)})`);
    } else {
      score += weights.noHttps;
      reasoning.push(`Source does not use HTTPS (${this._formatDelta(weights.noHttps)})`);
    }

    if (this.reputableDomains.has(domain)) {
      score += weights.reputableDomain;
      reasoning.push(`"${domain}" is a recognized reputable news source (${this._formatDelta(weights.reputableDomain)})`);
    }

    if (this.factCheckDomains.has(domain)) {
      score += weights.factCheckDomain;
      reasoning.push(`"${domain}" is a recognized fact-checking organization (${this._formatDelta(weights.factCheckDomain)})`);
    }

    const officialSource = this._isOfficialDomain(domain);
    if (officialSource) {
      score += weights.governmentDomain;
      reasoning.push(`"${domain}" is an official government source (${this._formatDelta(weights.governmentDomain)})`);
    }

    if (this._isEducationalDomain(domain)) {
      score += weights.educationalDomain;
      reasoning.push(`"${domain}" is an educational institution domain (${this._formatDelta(weights.educationalDomain)})`);
    }

    if (domain.endsWith('.org') && !this.reputableDomains.has(domain) && !this.factCheckDomains.has(domain)) {
      score += weights.organizationDomain;
      reasoning.push(`"${domain}" uses an organization TLD (${this._formatDelta(weights.organizationDomain)})`);
    }

    const domainTld = `.${domain.split('.').pop()}`;
    if (this.suspiciousTlds.has(domainTld)) {
      score += weights.suspiciousTld;
      reasoning.push(`"${domain}" uses suspicious TLD "${domainTld}" (${this._formatDelta(weights.suspiciousTld)})`);
    }

    const domainBase = domain.split('.')[0];
    if (domainBase.length <= 3 && !this.reputableDomains.has(domain)) {
      score += weights.shortDomain;
      reasoning.push(`Domain name "${domainBase}" is very short (${this._formatDelta(weights.shortDomain)})`);
    }

    const hyphenCount = (domainBase.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      score += weights.excessiveHyphens;
      reasoning.push(`Domain contains ${hyphenCount} hyphens (${this._formatDelta(weights.excessiveHyphens)})`);
    }

    const digitRatio = domainBase.length > 0 ? (domainBase.match(/\d/g) || []).length / domainBase.length : 0;
    if (digitRatio > 0.5 && domainBase.length > 3) {
      score += weights.numericHeavyDomain;
      reasoning.push(`Domain name is heavily numeric (${this._formatDelta(weights.numericHeavyDomain)})`);
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    const isReputable = this.reputableDomains.has(domain) || this.factCheckDomains.has(domain);
    const reliability = this._getReliability(score);
    const historicalConfidence = isReputable || officialSource ? score : Math.min(score, 70);

    console.log(`[SOURCE CREDIBILITY TOOL] Score for "${domain}": ${score}`);

    return {
      score,
      trustScore: score,
      reasoning,
      reason: reasoning.join(' '),
      domain,
      reliability,
      officialSource,
      historicalConfidence,
      isReputable,
    };
  }

  _isOfficialDomain(domain) {
    return domain.endsWith('.gov')
      || domain.endsWith('.gov.in')
      || domain.endsWith('.gov.uk')
      || domain.endsWith('.gov.au');
  }

  _isEducationalDomain(domain) {
    return domain.endsWith('.edu')
      || domain.endsWith('.ac.in')
      || domain.endsWith('.ac.uk');
  }

  _getReliability(score) {
    if (score >= 85) return 'very_high';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 30) return 'low';
    return 'very_low';
  }

  _formatDelta(value) {
    return value >= 0 ? `+${value}` : `${value}`;
  }
}

export default SourceCredibilityTool;
