/**
 * SourceCredibilityTool
 * 
 * Evaluates the credibility of a URL or domain based on multiple heuristic
 * signals. Produces a 0-100 score with detailed reasoning.
 * 
 * WHY THIS EXISTS:
 * When the agent encounters URLs or source references, it needs to assess
 * whether those sources are trustworthy. This tool provides a lightweight,
 * deterministic scoring system — no external API calls required.
 * 
 * SCORING CRITERIA:
 * - HTTPS protocol (+15 points)
 * - Known reputable news domains (+30 points)
 * - Government domain .gov (+25 points)
 * - Educational domain .edu (+20 points)
 * - Known fact-checking organizations (+25 points)
 * - Suspicious TLD penalties (-15 points)
 * - Short/random domain name penalties (-10 points)
 */

/** Set of known reputable news and media domains */
const REPUTABLE_DOMAINS = new Set([
  // Major wire services
  'reuters.com', 'apnews.com', 'afp.com',
  // US major outlets
  'nytimes.com', 'washingtonpost.com', 'wsj.com', 'usatoday.com',
  'npr.org', 'pbs.org', 'abcnews.go.com', 'cbsnews.com', 'nbcnews.com',
  'cnn.com', 'foxnews.com', 'msnbc.com', 'bbc.com', 'bbc.co.uk',
  // International
  'theguardian.com', 'economist.com', 'ft.com', 'aljazeera.com',
  'dw.com', 'france24.com', 'abc.net.au', 'cbc.ca',
  // India
  'thehindu.com', 'indianexpress.com', 'ndtv.com', 'hindustantimes.com',
  'timesofindia.indiatimes.com', 'livemint.com',
  // Science and tech
  'nature.com', 'sciencemag.org', 'thelancet.com', 'nejm.org',
  'scientificamerican.com', 'wired.com', 'techcrunch.com',
]);

/** Set of known fact-checking organizations */
const FACT_CHECK_DOMAINS = new Set([
  'politifact.com', 'snopes.com', 'factcheck.org', 'fullfact.org',
  'altnews.in', 'boomlive.in', 'vishvasnews.com', 'thequint.com',
  'checkyourfact.com', 'leadstories.com',
]);

/** Suspicious top-level domains often associated with unreliable content */
const SUSPICIOUS_TLDS = new Set([
  '.xyz', '.top', '.buzz', '.click', '.link', '.win', '.gq', '.cf',
  '.tk', '.ml', '.ga', '.info', '.biz', '.pw', '.cc',
]);

class SourceCredibilityTool {
  constructor() {
    this.name = 'SourceCredibilityTool';
    this.description = 'Evaluates the credibility of a source URL or domain. Checks for HTTPS, known reputable news outlets, government/educational domains, and suspicious indicators. Returns a credibility score (0-100) with detailed reasoning.';
  }

  /**
   * Execute the source credibility evaluation
   * @param {string} input - A URL or domain name to evaluate
   * @returns {Promise<{score: number, reasoning: string[], domain: string, isReputable: boolean}>}
   */
  async execute(input) {
    console.log(`[SOURCE CREDIBILITY TOOL] Evaluating: "${input}"`);

    const reasoning = [];
    let score = 50; // Start at neutral
    let domain = '';
    let isHttps = false;

    // Parse the URL to extract domain and protocol
    try {
      // Handle bare domains without protocol
      const urlString = input.includes('://') ? input : `https://${input}`;
      const parsed = new URL(urlString);
      domain = parsed.hostname.replace(/^www\./, '').toLowerCase();
      isHttps = parsed.protocol === 'https:';
    } catch (error) {
      // If URL parsing fails, treat the input as a raw domain
      domain = input.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
    }

    if (!domain) {
      return {
        score: 0,
        reasoning: ['Could not parse a valid domain from the input.'],
        domain: input,
        isReputable: false,
      };
    }

    // ─── Scoring Checks ─────────────────────────────────

    // 1. HTTPS check
    if (isHttps) {
      score += 15;
      reasoning.push('Source uses HTTPS (secure connection) (+15)');
    } else {
      score -= 5;
      reasoning.push('Source does not use HTTPS (-5)');
    }

    // 2. Known reputable news domain
    if (REPUTABLE_DOMAINS.has(domain)) {
      score += 30;
      reasoning.push(`"${domain}" is a recognized reputable news source (+30)`);
    }

    // 3. Known fact-checking organization
    if (FACT_CHECK_DOMAINS.has(domain)) {
      score += 25;
      reasoning.push(`"${domain}" is a recognized fact-checking organization (+25)`);
    }

    // 4. Government domain
    if (domain.endsWith('.gov') || domain.endsWith('.gov.in') || domain.endsWith('.gov.uk') || domain.endsWith('.gov.au')) {
      score += 25;
      reasoning.push(`"${domain}" is a government domain (+25)`);
    }

    // 5. Educational domain
    if (domain.endsWith('.edu') || domain.endsWith('.ac.in') || domain.endsWith('.ac.uk')) {
      score += 20;
      reasoning.push(`"${domain}" is an educational institution domain (+20)`);
    }

    // 6. Non-profit / Organization domain
    if (domain.endsWith('.org') && !REPUTABLE_DOMAINS.has(domain) && !FACT_CHECK_DOMAINS.has(domain)) {
      score += 5;
      reasoning.push(`"${domain}" uses .org TLD (organizational) (+5)`);
    }

    // 7. Suspicious TLD penalty
    const domainTLD = '.' + domain.split('.').pop();
    if (SUSPICIOUS_TLDS.has(domainTLD)) {
      score -= 15;
      reasoning.push(`"${domain}" uses suspicious TLD "${domainTLD}" (-15)`);
    }

    // 8. Very short or random-looking domain names
    const domainBase = domain.split('.')[0];
    if (domainBase.length <= 3 && !REPUTABLE_DOMAINS.has(domain)) {
      score -= 10;
      reasoning.push(`Domain name "${domainBase}" is very short, possibly suspicious (-10)`);
    }

    // 9. Excessive hyphens (common in fake news domains)
    const hyphenCount = (domainBase.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      score -= 10;
      reasoning.push(`Domain contains ${hyphenCount} hyphens, which is common in unreliable sources (-10)`);
    }

    // 10. Numeric-heavy domain names
    const digitRatio = (domainBase.match(/\d/g) || []).length / domainBase.length;
    if (digitRatio > 0.5 && domainBase.length > 3) {
      score -= 10;
      reasoning.push(`Domain name is heavily numeric (${Math.round(digitRatio * 100)}% digits), potentially auto-generated (-10)`);
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isReputable = REPUTABLE_DOMAINS.has(domain) || FACT_CHECK_DOMAINS.has(domain);

    console.log(`[SOURCE CREDIBILITY TOOL] Score for "${domain}": ${score}`);

    return {
      score,
      reasoning,
      domain,
      isReputable,
    };
  }
}

export default SourceCredibilityTool;
