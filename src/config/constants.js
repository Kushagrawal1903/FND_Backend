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
