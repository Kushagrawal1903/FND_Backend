import googleFactCheckService from '../../services/googleFactCheck.service.js';
import logger from '../../utils/logger.js';

/**
 * Google Fact Check Tool
 * Wraps the existing GoogleFactCheckService with an in-memory TTL cache
 * to avoid duplicate API calls for the same query within a single analysis run.
 */
class GoogleFactCheckTool {
  constructor() {
    /** @type {Map<string, { data: any, expiresAt: number }>} */
    this._cache = new Map();
    this._ttlMs = 5 * 60 * 1000; // 5-minute cache
  }

  /**
   * Search for fact-check reports matching a query.
   * Returns cached results if the same query was searched recently.
   * @param {string} query - Claim text to search
   * @returns {Promise<Array>} Fact-check claims from Google or cache
   */
  async searchClaims(query) {
    if (!query || typeof query !== 'string') return [];

    const cacheKey = query.toLowerCase().trim();

    // Check cache
    const cached = this._cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug('[FACTCHECK_TOOL] Cache hit for query');
      return cached.data;
    }

    // Cache miss — call the real service
    const results = await googleFactCheckService.searchClaims(query);

    // Store in cache
    this._cache.set(cacheKey, {
      data: results,
      expiresAt: Date.now() + this._ttlMs,
    });

    // Lazy cleanup: remove expired entries when cache grows large
    if (this._cache.size > 100) {
      this._evictExpired();
    }

    return results;
  }

  /**
   * Remove expired cache entries
   */
  _evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this._cache) {
      if (now >= entry.expiresAt) {
        this._cache.delete(key);
      }
    }
  }
}

export default new GoogleFactCheckTool();
