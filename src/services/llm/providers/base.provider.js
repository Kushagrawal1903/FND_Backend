/**
 * Base LLM Provider class
 * Defines the contract that all specific LLM providers must implement
 */
export class BaseProvider {
  /**
   * Analyzes the provided news text
   * @param {string} newsText - The text of the article/claim to analyze
   * @returns {Promise<Object>} Normalized analysis response
   */
  async analyzeNews(newsText) {
    throw new Error('Method "analyzeNews" must be implemented by subclass');
  }

  /**
   * Sends a generic prompt to the LLM and returns the raw text response.
   * Used by the agent layer for planning and reasoning — not tied to any specific prompt template.
   * @param {string} prompt - The full prompt text to send
   * @returns {Promise<string>} Raw text response from the LLM
   */
  async generate(prompt) {
    throw new Error('Method "generate" must be implemented by subclass');
  }

  /**
   * Helper method to return the provider's identifier name
   * @returns {string} The name of the provider (e.g., 'gemini', 'groq')
   */
  getProviderName() {
    throw new Error('Method "getProviderName" must be implemented by subclass');
  }
}

export default BaseProvider;
