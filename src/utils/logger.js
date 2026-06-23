/**
 * Structured Logger
 * Provides consistent logging formats with timestamps
 */

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (message, ...args) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
  },
  
  warn: (message, ...args) => {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
  },
  
  error: (message, ...args) => {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
  },
  
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
    }
  }
};

export default logger;
