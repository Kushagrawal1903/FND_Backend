import providerFactory from './providerFactory.js';
import { llmConfig } from '../../config/llm.config.js';
import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Central orchestrator for LLM operations
 * Handles provider selection, fallback logic, and retries
 */
class LLMService {
  /**
   * Helper to execute a promise with a timeout
   */
  async _withTimeout(promise, ms) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });

    return Promise.race([
      promise,
      timeoutPromise
    ]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  /**
   * Analyze news text using the configured LLM provider with fallback
   * @param {string} newsText - The article or claim to analyze
   * @returns {Promise<Object>} The normalized analysis result
   */
  async analyzeNews(newsText) {
    const primaryName = llmConfig.provider;
    const fallbackName = llmConfig.fallbackProvider;
    const timeoutMs = llmConfig.timeout || 30000;
    const maxRetries = llmConfig.maxRetries || 2;

    console.log(`[LLM] Service entered. Selected provider: ${primaryName}`);
    console.log(`[LLM] Configuration - Timeout: ${timeoutMs}ms, Max Retries: ${maxRetries}`);

    // Try primary provider
    try {
      return await this._attemptAnalysis(primaryName, newsText, timeoutMs, maxRetries);
    } catch (primaryError) {
      console.warn(`[LLM] Primary provider (${primaryName}) failed: ${primaryError.message}`);

      // Try fallback if configured and different from primary
      if (fallbackName && fallbackName !== primaryName) {
        console.log(`[LLM] Fallback activation: Attempting fallback provider ${fallbackName}`);
        try {
          return await this._attemptAnalysis(fallbackName, newsText, timeoutMs, maxRetries);
        } catch (fallbackError) {
          console.error(`[LLM] Fallback provider (${fallbackName}) also failed: ${fallbackError.message}`);
          throw new AppError('News analysis failed across all available AI providers', 503);
        }
      }

      throw new AppError('News analysis failed, and no fallback provider is configured', 503);
    }
  }

  /**
   * Attempts analysis with a specific provider, including retry logic
   */
  async _attemptAnalysis(providerName, newsText, timeoutMs, maxRetries) {
    const provider = providerFactory.getProvider(providerName);
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[LLM] Retries: Attempt ${attempt}/${maxRetries} for provider ${providerName}`);
        } else {
          console.log(`[LLM] Attempting analysis using provider: ${providerName}`);
        }
        
        const result = await this._withTimeout(
          provider.analyzeNews(newsText), 
          timeoutMs
        );
        
        console.log(`[LLM] Analysis successful with ${providerName}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[LLM] Provider ${providerName} attempt ${attempt} failed: ${error.message}`);
        
        // Don't retry on configuration errors (e.g., missing API key)
        if (error.message.includes('not configured')) {
          throw error;
        }
      }
    }

    throw lastError;
  }
}

export default new LLMService();
