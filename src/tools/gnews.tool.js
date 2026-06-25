import axios from 'axios';
import { config } from '../config/env.js';
import { startTimer, stopTimer } from '../utils/timer.js';

class GNewsTool {
  constructor() {
    this.name = 'gnews';
    this.description = 'Searches recent and current news articles using the official GNews REST API. Use this for breaking news, current affairs, political news, and claims that need recent reporting context.';
    this.apiUrl = 'https://gnews.io/api/v4/search';
  }

  /**
   * Execute a GNews search.
   * @param {string|{query: string, language?: string, country?: string, maxResults?: number}} input
   * @returns {Promise<{results: Array, totalResults: number, searchQuery: string, provider: string, skipped?: boolean, reason?: string}>}
   */
  async execute(input) {
    const started = startTimer();
    const request = this._normalizeInput(input);

    //console.log(`[GNEWS TOOL] Searching for: "${request.query}"`);
    console.log(`🔥 GNEWS EXECUTE CALLED 🔥`);
    if (!config.gnews.apiKey) {
      const durationMs = stopTimer(started);
      const reason = 'GNews API key is not configured. Skipping GNews search.';
      console.warn(`[GNEWS TOOL] ${reason}`);
      console.log(`[GNEWS TOOL] Articles found: 0`);
      console.log(`[GNEWS TOOL] Execution Time: ${durationMs} ms`);

      return {
        results: [],
        totalResults: 0,
        searchQuery: request.query,
        provider: 'gnews',
        skipped: true,
        reason,
      };
    }

    try {
      const params = {
          q: request.query,
          lang: request.language,
          max: request.maxResults,
          apikey: config.gnews.apiKey,
      };

      if (request.country && request.country !== 'any') {
        params.country = request.country;
      }

      const response = await axios.get(this.apiUrl, {
        params,
        timeout: 10000,
      });

      const articles = Array.isArray(response.data?.articles) ? response.data.articles : [];
      const results = articles.map(article => this._normalizeArticle(article));
      const durationMs = stopTimer(started);

      console.log(`[GNEWS TOOL] Articles found: ${results.length}`);
      console.log(`[GNEWS TOOL] Execution Time: ${durationMs} ms`);

      return {
        results,
        totalResults: results.length,
        searchQuery: request.query,
        provider: 'gnews',
      };
    } catch (error) {
      const durationMs = stopTimer(started);
      const errorMessage = error.response?.data?.errors
        ? JSON.stringify(error.response.data.errors)
        : error.response?.data?.message || error.message;

      console.error(`[GNEWS TOOL] Error: ${errorMessage}`);
      console.log(`[GNEWS TOOL] Articles found: 0`);
      console.log(`[GNEWS TOOL] Execution Time: ${durationMs} ms`);

      return {
        results: [],
        totalResults: 0,
        searchQuery: request.query,
        provider: 'gnews',
        error: errorMessage,
      };
    }
  }

  _normalizeInput(input) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return {
        query: this._sanitizeQuery(input.query),
        language: input.language || 'en',
        country: input.country || 'any',
        maxResults: this._normalizeMaxResults(input.maxResults),
      };
    }

    return {
      query: this._sanitizeQuery(input),
      language: 'en',
      country: 'any',
      maxResults: 10,
    };
  }

  _normalizeMaxResults(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 10;
    return Math.max(1, Math.min(10, Math.round(numeric)));
  }

  _normalizeArticle(article) {
    const sourceName = article.source?.name || 'GNews';

    return {
      title: article.title || '',
      description: article.description || '',
      url: article.url || '',
      source: sourceName,
      publishedAt: article.publishedAt || null,
      image: article.image || '',
      content: article.content || '',
      provider: 'gnews',
      credibilityScore: null,
      evidenceType: 'news_article',
    };
  }

  _sanitizeQuery(query) {
    return String(query || '')
      .replace(/[:"()[\]{}]/g, ' ')
      .replace(/\b(AND|OR|NOT)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default GNewsTool;
