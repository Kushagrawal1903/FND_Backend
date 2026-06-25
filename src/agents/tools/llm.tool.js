import providerFactory from '../../services/llm/providerFactory.js';
import { llmConfig } from '../../config/llm.config.js';
import { safeParseJSON } from '../../utils/jsonParser.js';
import logger from '../../utils/logger.js';

/**
 * LLM Tool
 * Thin wrapper around the existing LLM provider infrastructure.
 * Agents call this instead of using llm.service.js directly, so we can
 * add agent-specific prompt formatting, timeout, and JSON extraction.
 */
class LLMTool {
  /**
   * Send a prompt to the LLM and return parsed JSON.
   * Falls back through providers automatically via the existing factory.
   * @param {string} systemPrompt - System-level instruction
   * @param {string} userPrompt - The user-facing content to analyze
   * @returns {Promise<Object|null>} Parsed JSON or null on failure
   */
  async generateJSON(systemPrompt, userPrompt) {
    const rawText = await this._generate(systemPrompt, userPrompt);
    const parsed = safeParseJSON(rawText);
    if (!parsed) {
      logger.warn('[LLM_TOOL] Failed to parse JSON from LLM response');
    }
    return parsed;
  }

  /**
   * Send a prompt to the LLM and return raw text.
   * @param {string} systemPrompt - System-level instruction
   * @param {string} userPrompt - The user-facing content
   * @returns {Promise<string>} Raw LLM text response
   */
  async generateText(systemPrompt, userPrompt) {
    return this._generate(systemPrompt, userPrompt);
  }

  /**
   * Internal: execute the LLM call with timeout and fallback.
   * Reuses the existing provider factory so we get retry + fallback for free.
   */
  async _generate(systemPrompt, userPrompt) {
    const primaryName = llmConfig.provider;
    const fallbackName = llmConfig.fallbackProvider;
    const timeoutMs = llmConfig.timeout || 30000;
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Try primary provider
    try {
      return await this._callProvider(primaryName, combinedPrompt, timeoutMs);
    } catch (primaryError) {
      logger.warn(`[LLM_TOOL] Primary provider (${primaryName}) failed: ${primaryError.message}`);

      // Try fallback
      if (fallbackName && fallbackName !== primaryName) {
        try {
          return await this._callProvider(fallbackName, combinedPrompt, timeoutMs);
        } catch (fallbackError) {
          logger.error(`[LLM_TOOL] Fallback provider (${fallbackName}) also failed: ${fallbackError.message}`);
          throw fallbackError;
        }
      }
      throw primaryError;
    }
  }

  /**
   * Call a specific LLM provider and extract the text response.
   */
  async _callProvider(providerName, prompt, timeoutMs) {
    const provider = providerFactory.getProvider(providerName);
    const config = llmConfig.providers[providerName];

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`LLM timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    // Use the provider's underlying AI client directly for custom prompts
    // rather than going through analyzeNews() which has a hardcoded prompt
    const generatePromise = (async () => {
      if (providerName === 'gemini') {
        const response = await provider.ai.models.generateContent({
          model: config.model,
          contents: prompt,
          config: { temperature: config.options.temperature },
        });
        return response.text;
      } else if (providerName === 'groq') {
        const response = await provider.groq.chat.completions.create({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          ...config.options,
        });
        return response.choices[0]?.message?.content || '';
      }
      throw new Error(`Unknown provider: ${providerName}`);
    })();

    try {
      return await Promise.race([generatePromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default new LLMTool();
