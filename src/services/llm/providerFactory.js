import { AppError } from '../../utils/errors.js';
import GeminiProvider from './providers/gemini.provider.js';
import GroqProvider from './providers/groq.provider.js';
import { llmConfig } from '../../config/llm.config.js';

/**
 * Factory for creating and managing LLM Provider instances
 */
class ProviderFactory {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Get an instance of the requested LLM provider
   * @param {string} providerName - 'gemini' or 'groq'
   * @returns {BaseProvider} The initialized provider instance
   */
  getProvider(providerName) {
    if (!providerName) {
      providerName = llmConfig.provider || 'gemini';
    }

    const name = providerName.toLowerCase();

    // Return cached instance if it exists
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    let instance;

    switch (name) {
      case 'gemini':
        instance = new GeminiProvider();
        break;
      case 'groq':
        instance = new GroqProvider();
        break;
      default:
        throw new AppError(`Unsupported LLM provider: ${name}`, 500);
    }

    // Cache the instance
    this.instances.set(name, instance);
    return instance;
  }
}

export default new ProviderFactory();
