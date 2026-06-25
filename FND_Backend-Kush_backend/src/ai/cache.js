class LocalCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Normalizes the claim key for consistent cache lookups
   * @param {string} key
   * @returns {string}
   */
  normalizeKey(key) {
    if (!key || typeof key !== 'string') return '';
    return key.toLowerCase().trim();
  }

  /**
   * Gets a cached item if it exists and is not expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const normalized = this.normalizeKey(key);
    if (!normalized) return null;

    const cached = this.cache.get(normalized);
    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(normalized);
      return null;
    }

    return cached.value;
  }

  /**
   * Sets a value in cache with a TTL (Time To Live)
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs - Default is 5 minutes (300,000 ms)
   */
  set(key, value, ttlMs = 5 * 60 * 1000) {
    const normalized = this.normalizeKey(key);
    if (!normalized) return;

    this.cache.set(normalized, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Clears the entire cache
   */
  clear() {
    this.cache.clear();
  }
}

export default new LocalCache();
