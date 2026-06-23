/**
 * LLM Configuration
 * Centralized settings for LLM providers and models
 */
import { config as appConfig } from './env.js';

export const llmConfig = {
  provider: appConfig.llm.provider,
  fallbackProvider: appConfig.llm.fallbackProvider,
  timeout: appConfig.llm.timeout,
  maxRetries: appConfig.llm.maxRetries,
  
  // Provider-specific settings
  providers: {
    gemini: {
      apiKey: appConfig.llm.geminiApiKey,
      model: 'gemini-2.5-flash',
      options: {
        temperature: 0.2,
      }
    },
    groq: {
      apiKey: appConfig.llm.groqApiKey,
      model: 'llama-3.3-70b-versatile',
      options: {
        temperature: 0.2,
        max_tokens: 4096,
      }
    }
  }
};

export default llmConfig;
