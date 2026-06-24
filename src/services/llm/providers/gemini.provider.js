import { GoogleGenAI } from '@google/genai';
import BaseProvider from './base.provider.js';
import { llmConfig } from '../../../config/llm.config.js';
import { buildAnalysisPrompt } from '../prompts/fakeNews.prompt.js';
import { safeParseJSON, normalizeAnalysisResponse } from '../../../utils/jsonParser.js';

/**
 * Gemini LLM Provider implementation
 */
export class GeminiProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'gemini';
    const config = llmConfig.providers.gemini;
    
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.modelName = config.model;
    this.options = config.options;
  }

  getProviderName() {
    return this.name;
  }

  /**
   * Sends a generic prompt to Gemini and returns the raw text response.
   * @param {string} prompt - The full prompt text
   * @returns {Promise<string>} Raw text response
   */
  async generate(prompt) {
    try {
      console.log(`[GEMINI] Generic generate request using model ${this.modelName}`);
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: this.options.temperature,
        },
      });
      return response.text;
    } catch (error) {
      console.error(`[GEMINI] Error in generate: ${error.message}`);
      throw error;
    }
  }

  async analyzeNews(newsText) {
    try {
      const apiKeyPresent = !!llmConfig.providers.gemini.apiKey;
      console.log(`[GEMINI] API key present: ${apiKeyPresent}`);
      console.log(`[GEMINI] Request sent: Using model ${this.modelName}`);

      const prompt = buildAnalysisPrompt(newsText);
      
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: this.options.temperature,
        }
      });

      const rawText = response.text;
      console.log(`[GEMINI] Raw response received: ${rawText}`);

      const parsedJson = safeParseJSON(rawText);
      console.log(`[GEMINI] Parsed response: ${JSON.stringify(parsedJson)}`);

      const normalized = normalizeAnalysisResponse(parsedJson, this.name);
      return normalized;
    } catch (error) {
      console.error(`[GEMINI] Error analyzing news: ${error.message}`);
      throw error;
    }
  }
}

export default GeminiProvider;
