import axios from 'axios';
import { config } from '../config/env.js';

class GroqProvider {
  constructor() {
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  /**
   * Generates content from Groq models
   * @param {string} systemInstruction
   * @param {string} userPrompt
   * @returns {Promise<{text: string, model: string}>}
   */
  async generate(systemInstruction, userPrompt) {
    const apiKey = config.groq.apiKey;
    if (!apiKey) {
      throw new Error('Groq API Key is not configured');
    }

    const modelName = config.groq.model || 'llama-3.3-70b-versatile';

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: modelName,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        return {
          text: response.data.choices[0].message.content.trim(),
          model: modelName,
        };
      }

      throw new Error('Invalid response structure from Groq API');
    } catch (error) {
      console.error('Groq API call failed:', error.message);
      throw error;
    }
  }
}

export default new GroqProvider();
