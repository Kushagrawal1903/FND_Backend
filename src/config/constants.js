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
