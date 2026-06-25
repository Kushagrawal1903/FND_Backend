/**
 * Application Constants
 */

export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

export const VERDICTS = {
  TRUE: 'true',
  FALSE: 'false',
  MIXTURE: 'mixture',
  UNVERIFIED: 'unverified',
  // Agentic pipeline verdicts
  LIKELY_TRUE: 'likely_true',
  LIKELY_FALSE: 'likely_false',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
};

export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved',
};

export const API_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100, // Max requests per window for standard endpoints
  AUTH_MAX_REQUESTS: 15, // Strict rate limiting for auth endpoints (registration, login)
  CHECK_MAX_REQUESTS: 30, // Rate limit for verification requests
};

/**
 * Claim type classifications for targeted research
 */
export const CLAIM_TYPES = {
  STATISTICAL: 'statistical',
  POLITICAL: 'political',
  SCIENTIFIC: 'scientific',
  HISTORICAL: 'historical',
  NEWS: 'news',
  RANKING: 'ranking',
};

/**
 * Fact-check result statuses — NOT_FOUND is explicitly neutral
 */
export const FACT_CHECK_STATUSES = {
  VERIFIED_TRUE: 'verified_true',
  VERIFIED_FALSE: 'verified_false',
  NOT_FOUND: 'not_found',
};

/**
 * Source authority tiers — lower tier number = higher authority
 */
export const SOURCE_TIERS = {
  TIER_1: 1, // Government, official bodies, intl orgs
  TIER_2: 2, // Major wire services & reputable media
  TIER_3: 3, // Wikipedia, blogs, community sites, unknown
};

/**
 * Agent identifiers used across the agentic pipeline
 */
export const AGENT_NAMES = {
  ORCHESTRATOR: 'ORCHESTRATOR',
  CLAIM: 'CLAIM_AGENT',
  SOURCE: 'SOURCE_AGENT',
  FACTCHECK: 'FACTCHECK_AGENT',
  RESEARCH: 'RESEARCH_AGENT',
  BIAS: 'BIAS_AGENT',
  EVIDENCE: 'EVIDENCE_AGENT',
  VERDICT: 'VERDICT_AGENT',
};
