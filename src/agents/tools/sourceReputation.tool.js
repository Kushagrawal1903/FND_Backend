import logger from '../../utils/logger.js';
import { SOURCE_TIERS } from '../../config/constants.js';

/**
 * Source Reputation Tool
 * Deterministic domain reputation lookup against a curated dataset.
 * No LLM required — pure data lookup with caching.
 *
 * Source Authority Tiers:
 *   Tier 1 — Government, official bodies, intl orgs (authorityScore 90-100)
 *   Tier 2 — Major wire services & reputable media (authorityScore 75-90)
 *   Tier 3 — Wikipedia, blogs, community sites, unknown (authorityScore 30-70)
 */

/**
 * Curated source reputation database.
 * Each entry has: score (0-100 trust), category, tier (1/2/3), authorityScore (0-100).
 */
const REPUTATION_DB = {
  // ─── Tier 1: Government, Official Bodies, International Orgs ───
  'pib.gov.in':                  { score: 98, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'india.gov.in':                { score: 98, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'swachhbharaturban.gov.in':    { score: 98, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'mohua.gov.in':                { score: 98, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'eci.gov.in':                  { score: 98, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'niti.gov.in':                 { score: 97, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 98 },
  'mha.gov.in':                  { score: 97, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 98 },
  'cdc.gov':                     { score: 95, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 97 },
  'nih.gov':                     { score: 95, category: 'government', tier: SOURCE_TIERS.TIER_1, authorityScore: 97 },
  'who.int':                     { score: 95, category: 'international_org', tier: SOURCE_TIERS.TIER_1, authorityScore: 97 },
  'un.org':                      { score: 95, category: 'international_org', tier: SOURCE_TIERS.TIER_1, authorityScore: 96 },
  'worldbank.org':               { score: 94, category: 'international_org', tier: SOURCE_TIERS.TIER_1, authorityScore: 95 },
  'nature.com':                  { score: 95, category: 'scientific_journal', tier: SOURCE_TIERS.TIER_1, authorityScore: 96 },
  'science.org':                 { score: 95, category: 'scientific_journal', tier: SOURCE_TIERS.TIER_1, authorityScore: 96 },
  'lancet.com':                  { score: 95, category: 'scientific_journal', tier: SOURCE_TIERS.TIER_1, authorityScore: 96 },
  'bcci.tv':                     { score: 98, category: 'official_sports_body', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'icc-cricket.com':             { score: 98, category: 'official_sports_body', tier: SOURCE_TIERS.TIER_1, authorityScore: 100 },
  'fifa.com':                    { score: 98, category: 'official_sports_body', tier: SOURCE_TIERS.TIER_1, authorityScore: 98 },
  'olympics.com':                { score: 98, category: 'official_sports_body', tier: SOURCE_TIERS.TIER_1, authorityScore: 98 },

  // ─── Tier 2: Major Wire Services & Reputable Media ───
  'reuters.com':                 { score: 95, category: 'wire_service', tier: SOURCE_TIERS.TIER_2, authorityScore: 90 },
  'apnews.com':                  { score: 95, category: 'wire_service', tier: SOURCE_TIERS.TIER_2, authorityScore: 90 },
  'bbc.com':                     { score: 90, category: 'public_broadcaster', tier: SOURCE_TIERS.TIER_2, authorityScore: 88 },
  'bbc.co.uk':                   { score: 90, category: 'public_broadcaster', tier: SOURCE_TIERS.TIER_2, authorityScore: 88 },
  'ndtv.com':                    { score: 88, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 85 },
  'indianexpress.com':           { score: 87, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 85 },
  'thehindu.com':                { score: 87, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 85 },
  'economictimes.indiatimes.com':{ score: 86, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 84 },
  'hindustantimes.com':          { score: 85, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 83 },
  'timesofindia.indiatimes.com': { score: 84, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 82 },
  'nytimes.com':                 { score: 88, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 87 },
  'washingtonpost.com':          { score: 87, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 86 },
  'theguardian.com':             { score: 85, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 84 },
  'wsj.com':                     { score: 88, category: 'major_newspaper', tier: SOURCE_TIERS.TIER_2, authorityScore: 87 },
  'npr.org':                     { score: 88, category: 'public_broadcaster', tier: SOURCE_TIERS.TIER_2, authorityScore: 86 },
  'pbs.org':                     { score: 88, category: 'public_broadcaster', tier: SOURCE_TIERS.TIER_2, authorityScore: 86 },
  'economist.com':               { score: 87, category: 'magazine', tier: SOURCE_TIERS.TIER_2, authorityScore: 85 },

  // Fact-checking organizations (Tier 2)
  'snopes.com':                  { score: 88, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 87 },
  'politifact.com':              { score: 87, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 86 },
  'factcheck.org':               { score: 88, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 87 },
  'fullfact.org':                { score: 86, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 85 },
  'altnews.in':                  { score: 85, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 84 },
  'boomlive.in':                 { score: 85, category: 'fact_checker', tier: SOURCE_TIERS.TIER_2, authorityScore: 84 },

  // ─── Tier 3: Mixed/Opinion/Community/Unknown ───
  'wikipedia.org':               { score: 70, category: 'encyclopedia', tier: SOURCE_TIERS.TIER_3, authorityScore: 65 },
  'en.wikipedia.org':            { score: 70, category: 'encyclopedia', tier: SOURCE_TIERS.TIER_3, authorityScore: 65 },
  'cnn.com':                     { score: 65, category: 'cable_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 60 },
  'foxnews.com':                 { score: 55, category: 'cable_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 50 },
  'msnbc.com':                   { score: 60, category: 'cable_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 55 },
  'huffpost.com':                { score: 55, category: 'online_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 50 },
  'buzzfeed.com':                { score: 45, category: 'online_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 40 },
  'vice.com':                    { score: 55, category: 'online_news', tier: SOURCE_TIERS.TIER_3, authorityScore: 50 },
  'dailymail.co.uk':             { score: 35, category: 'tabloid', tier: SOURCE_TIERS.TIER_3, authorityScore: 30 },
  'breitbart.com':               { score: 25, category: 'partisan', tier: SOURCE_TIERS.TIER_3, authorityScore: 20 },
  'infowars.com':                { score: 5,  category: 'conspiracy', tier: SOURCE_TIERS.TIER_3, authorityScore: 5 },
  'naturalnews.com':             { score: 8,  category: 'pseudoscience', tier: SOURCE_TIERS.TIER_3, authorityScore: 5 },
};

/** Patterns that indicate a government domain — any TLD */
const GOV_DOMAIN_PATTERNS = [/\.gov(\.\w+)?$/, /\.nic\.in$/];

/** Cache for already-looked-up domains */
const _domainCache = new Map();

class SourceReputationTool {
  /**
   * Look up the reputation of a source by URL or domain name.
   * @param {string} urlOrDomain - Full URL or bare domain
   * @returns {{ sourceName: string, trustScore: number, category: string, explanation: string, sourceTier: number, authorityScore: number }}
   */
  lookup(urlOrDomain) {
    if (!urlOrDomain) {
      return this._unknownResult('unknown');
    }

    const domain = this._extractDomain(urlOrDomain);

    if (_domainCache.has(domain)) {
      return _domainCache.get(domain);
    }

    const entry = this._findEntry(domain);

    let result;
    if (entry) {
      result = {
        sourceName: domain,
        trustScore: entry.score,
        category: entry.category,
        sourceTier: entry.tier,
        authorityScore: entry.authorityScore,
        explanation: this._buildExplanation(domain, entry),
      };
    } else if (this._isGovDomain(domain)) {
      // Government domains not in DB still get Tier 1
      result = {
        sourceName: domain,
        trustScore: 90,
        category: 'government',
        sourceTier: SOURCE_TIERS.TIER_1,
        authorityScore: 92,
        explanation: `"${domain}" is a government domain. High trust assigned automatically.`,
      };
    } else {
      result = this._unknownResult(domain);
    }

    _domainCache.set(domain, result);
    return result;
  }

  /**
   * Quick authority lookup for any URL — used by ResearchAgent to tag evidence.
   * @param {string} url
   * @returns {{ sourceTier: number, authorityScore: number }}
   */
  getAuthorityForUrl(url) {
    const rep = this.lookup(url);
    return { sourceTier: rep.sourceTier, authorityScore: rep.authorityScore };
  }

  /**
   * Find an entry by trying exact match, stripping www, and checking parent domain.
   */
  _findEntry(domain) {
    return REPUTATION_DB[domain]
      || REPUTATION_DB[domain.replace(/^www\./, '')]
      || this._findParentDomainEntry(domain)
      || null;
  }

  /**
   * Check if subdomain's parent is in the DB (e.g., m.ndtv.com → ndtv.com)
   */
  _findParentDomainEntry(domain) {
    const parts = domain.split('.');
    // Try progressively shorter domains: a.b.c.com → b.c.com → c.com
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      if (REPUTATION_DB[parent]) return REPUTATION_DB[parent];
    }
    return null;
  }

  /**
   * Check if a domain belongs to a government entity.
   */
  _isGovDomain(domain) {
    return GOV_DOMAIN_PATTERNS.some(p => p.test(domain));
  }

  /**
   * Extract the domain from a URL string.
   */
  _extractDomain(input) {
    try {
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
      trustScore: 50,
      category: 'unknown',
      sourceTier: SOURCE_TIERS.TIER_3,
      authorityScore: 40,
      explanation: `Source "${domain}" is not in our reputation database. A neutral trust score of 50 has been assigned. Manual verification is recommended.`,
    };
  }

  _buildExplanation(domain, entry) {
    const tierLabel = entry.tier === 1 ? 'Tier 1 (Government/Official)' : entry.tier === 2 ? 'Tier 2 (Reputable Media)' : 'Tier 3 (Other)';
    if (entry.score >= 85) {
      return `"${domain}" is a highly reputable ${entry.category.replace(/_/g, ' ')} source (${tierLabel}, trust ${entry.score}/100, authority ${entry.authorityScore}/100).`;
    }
    if (entry.score >= 60) {
      return `"${domain}" is a moderately trusted ${entry.category.replace(/_/g, ' ')} source (${tierLabel}, trust ${entry.score}/100). Content may contain editorial bias.`;
    }
    if (entry.score >= 30) {
      return `"${domain}" is a low-trust ${entry.category.replace(/_/g, ' ')} source (${tierLabel}, trust ${entry.score}/100). Content should be cross-referenced.`;
    }
    return `"${domain}" is a very low-trust ${entry.category.replace(/_/g, ' ')} source (${tierLabel}, trust ${entry.score}/100). High risk of misinformation.`;
  }
}

export default new SourceReputationTool();
