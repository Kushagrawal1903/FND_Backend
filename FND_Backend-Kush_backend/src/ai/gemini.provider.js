import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

class GeminiProvider {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: config.google.geminiApiKey || 'DUMMY_KEY',
    });
  }

  /**
   * Generates content from Gemini models
   * @param {string} systemInstruction
   * @param {string} userPrompt
   * @returns {Promise<{text: string, model: string}>}
   */
  async generate(systemInstruction, userPrompt) {
    const isKeyPresent = !!config.google.geminiApiKey && config.google.geminiApiKey !== 'DUMMY_KEY';
    console.log(`[GeminiProvider] Verification start. API Key configured: ${isKeyPresent}`);
    console.log(`[GeminiProvider] Prompt details: User prompt length = ${userPrompt.length} chars, System instruction length = ${systemInstruction?.length || 0} chars`);

    const modelCandidates = [];
    if (config.google.geminiModel) {
      modelCandidates.push(config.google.geminiModel);
    }
    // Use valid supported Google Gemini models as fallback candidates
    modelCandidates.push('gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash');

    const uniqueModels = [...new Set(modelCandidates)];
    let lastError = null;

    for (const modelName of uniqueModels) {
      console.log(`[GeminiProvider] Attempting API call using model: "${modelName}"...`);
      
      const apiCallPromise = (async () => {
        const response = await this.ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
          },
        });
        console.log(`[GeminiProvider] Received raw API response from model "${modelName}".`);
        return response;
      })();

      try {
        // Enforce 12 seconds timeout on the API request
        const response = await Promise.race([
          apiCallPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Gemini API request timed out after 12s for model "${modelName}"`)), 12000)
          ),
        ]);

        if (response) {
          let responseText = '';
          if (response.text) {
            responseText = response.text;
          } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
            responseText = response.candidates[0].content.parts[0].text;
          } else {
            console.warn(`[GeminiProvider] Response missing text block structure:`, JSON.stringify(response));
            throw new Error('Unsupported response content structure from Gemini SDK');
          }

          console.log(`[GeminiProvider] Successfully generated and verified response from model "${modelName}".`);
          return {
            text: responseText.trim(),
            model: modelName,
          };
        }
      } catch (error) {
        lastError = error;
        console.error(`[GeminiProvider] Error/Timeout with model "${modelName}":`, error.message);
      }
    }

    throw lastError || new Error('All configured Gemini model candidates failed or timed out');
  }
}

export default new GeminiProvider();
