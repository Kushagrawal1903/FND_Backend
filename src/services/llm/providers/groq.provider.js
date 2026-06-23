import Groq from 'groq-sdk';
import BaseProvider from './base.provider.js';
import { llmConfig } from '../../../config/llm.config.js';
import { buildAnalysisPrompt } from '../prompts/fakeNews.prompt.js';
import { safeParseJSON, normalizeAnalysisResponse } from '../../../utils/jsonParser.js';

/**
 * Groq LLM Provider implementation
 */
export class GroqProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'groq';
    const config = llmConfig.providers.groq;
    
    if (!config.apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    
    this.groq = new Groq({ apiKey: config.apiKey });
    this.modelName = config.model;
    this.options = config.options;
  }

  getProviderName() {
    return this.name;
  }

  async analyzeNews(newsText) {
    try {
      const apiKeyPresent = !!llmConfig.providers.groq.apiKey;
      console.log(`[GROQ] API key present: ${apiKeyPresent}`);
      console.log(`[GROQ] Request sent: Using model ${this.modelName}`);

      const prompt = buildAnalysisPrompt(newsText);
      
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        model: this.modelName,
        temperature: this.options.temperature,
        max_tokens: this.options.max_tokens,
      });

      const rawText = response.choices[0]?.message?.content || '';
      console.log(`[GROQ] Raw response received: ${rawText}`);

      const parsedJson = safeParseJSON(rawText);
      console.log(`[GROQ] Parsed response: ${JSON.stringify(parsedJson)}`);

      const normalized = normalizeAnalysisResponse(parsedJson, this.name);
      return normalized;
    } catch (error) {
      console.error(`[GROQ] Error analyzing news: ${error.message}`);
      throw error;
    }
  }
}

export default GroqProvider;
