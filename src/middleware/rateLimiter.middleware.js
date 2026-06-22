import rateLimit from 'express-rate-limit';
import { API_LIMITS } from '../config/constants.js';

/**
 * Global rate limiter for standard routes
 */
export const globalLimiter = rateLimit({
  windowMs: API_LIMITS.WINDOW_MS,
  max: API_LIMITS.MAX_REQUESTS,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive authentication endpoints (login, register)
 */
export const authLimiter = rateLimit({
  windowMs: API_LIMITS.WINDOW_MS,
  max: API_LIMITS.AUTH_MAX_REQUESTS,
  message: {
    status: 'fail',
    message: 'Too many login or registration attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for resource-intensive verification endpoints
 */
export const verificationLimiter = rateLimit({
  windowMs: API_LIMITS.WINDOW_MS,
  max: API_LIMITS.CHECK_MAX_REQUESTS,
  message: {
    status: 'fail',
    message: 'Too many news verification requests, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
