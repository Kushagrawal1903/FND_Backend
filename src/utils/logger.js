/**
 * Structured Logger
 * Provides consistent logging formats with timestamps and data masking
 */

const getTimestamp = () => new Date().toISOString();

// Mask sensitive data (keys, tokens, secrets, passwords, cookies, JWTs, etc.)
const maskSensitiveData = (args) => {
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'jwt', 'cookie', 'authorization'];
  
  const maskObject = (obj) => {
    if (obj == null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(maskObject);
    
    const masked = { ...obj };
    for (const k in masked) {
      if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
        masked[k] = '[REDACTED]';
      } else if (typeof masked[k] === 'object') {
        masked[k] = maskObject(masked[k]);
      } else if (typeof masked[k] === 'string' && masked[k].match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)) {
        // Basic JWT regex match
        masked[k] = '[REDACTED JWT]';
      }
    }
    return masked;
  };

  return args.map(arg => {
    if (typeof arg === 'object') return maskObject(arg);
    // basic string regex masking for things like "Bearer eyJ..."
    if (typeof arg === 'string') {
      return arg.replace(/Bearer\s+[A-Za-z0-9_.-]+/, 'Bearer [REDACTED]')
                .replace(/key=[A-Za-z0-9_.-]+/, 'key=[REDACTED]');
    }
    return arg;
  });
};

export const logger = {
  trace: (message, ...args) => {
    if (process.env.VERBOSE_AI_LOGGING === 'true') {
      const maskedArgs = maskSensitiveData(args);
      console.log(`[${getTimestamp()}] [TRACE] ${message}`, ...maskedArgs);
    }
  },

  info: (message, ...args) => {
    const maskedArgs = maskSensitiveData(args);
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...maskedArgs);
  },
  
  warn: (message, ...args) => {
    const maskedArgs = maskSensitiveData(args);
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...maskedArgs);
  },
  
  error: (message, ...args) => {
    const maskedArgs = maskSensitiveData(args);
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...maskedArgs);
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development' || process.env.VERBOSE_AI_LOGGING === 'true') {
      const maskedArgs = maskSensitiveData(args);
      console.log(`[${getTimestamp()}] [DEBUG] ${message}`, ...maskedArgs);
    }
  }
};

export default logger;
