import { GoogleGenAI } from "@google/genai";
import { config } from "../config/env.js";
import { VERDICTS } from "../config/constants.js";

/**
 * Service to generate AI explanations using Google Gemini
 */
class ExplanationService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: config.google.geminiApiKey || "DUMMY_KEY",
    });
  }

  /**
   * Generate AI explanation
   * @param {string} verdict
   * @param {number} confidence
   * @param {Array} sources
   * @param {string} originalClaim
   * @returns {Promise<string>}
   */
  async generateExplanation(verdict, confidence, sources, originalClaim) {
    let prompt;
    const hasSources = sources && sources.length > 0;

    if (
      verdict === VERDICTS.UNVERIFIED ||
      !hasSources
    ) {
      // Prompt for Unverified Claims
      prompt = `
You are a professional fact-checking assistant.

The following claim could not be verified because no official or trusted fact-check reports were found in the database.

Claim:
"${originalClaim}"

Calculated Verdict:
UNVERIFIED

Confidence Score:
0%

Instructions:
1. Explain objectively that no direct fact-checking reports were found for this specific claim.
2. Provide helpful background context about the topic based on your knowledge (for instance, clarify if there are G20 summit host plans or if the query contains typos like "submit" instead of "summit").
3. Warn the user to treat the information with caution and verify it from reliable primary sources.
4. Keep the explanation between 120-180 words.
5. Return only plain text.
`;
    } else {
      // Convert sources into readable text
      const sourceText = sources
        .map(
          (source, index) => `
Source ${index + 1}
Publisher: ${source.publisher}
Rating/Verdict: ${source.verdict}
URL: ${source.url}
`
        )
        .join("\n");

      // Prompt for Gemini
      prompt = `
You are a professional fact-checking assistant.

Analyze the following information and generate a natural-language explanation.

Claim:
"${originalClaim}"

Calculated Verdict:
${verdict}

Confidence Score:
${confidence}%

Fact Check Sources:

${sourceText}

Instructions:

1. Explain why this verdict was given.
2. Mention if multiple publishers agree.
3. Mention the confidence score naturally.
4. Do not invent facts.
5. Be objective and professional.
6. Keep the explanation between 120-180 words.
7. Return only plain text.
`;
    }

    const modelCandidates = [
      config.google.geminiModel || "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-2.5-flash"
    ];

    const uniqueModels = [...new Set(modelCandidates)];
    let lastError = null;

    for (const modelName of uniqueModels) {
      try {
        const response = await this.ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (error) {
        lastError = error;
        console.warn(`Failed to generate explanation using model ${modelName}:`, error.message);
      }
    }

    console.error("All Gemini model attempts failed. Using static fallback. Last error:", lastError ? lastError.message : "unknown");
    return this.generateFallback(verdict, confidence, sources, originalClaim);
  }

  /**
   * Fallback explanation if Gemini fails
   */
  generateFallback(verdict, confidence, sources, originalClaim) {
    if (verdict === VERDICTS.UNVERIFIED || !sources || sources.length === 0) {
      return `This claim ("${this._truncateText(
        originalClaim || "",
        100
      )}") could not be verified because no trusted fact-check reports were found. Please verify this information from reliable sources before sharing it.`;
    }

    const uniquePublishers = [...new Set(sources.map((s) => s.publisher))];
    const publishers = this._formatList(uniquePublishers);

    switch (verdict) {
      case VERDICTS.TRUE:
        return `This claim is VERIFIED AS TRUE with ${confidence}% confidence. Trusted organizations including ${publishers} support this conclusion.`;

      case VERDICTS.FALSE:
        return `This claim is VERIFIED AS FALSE with ${confidence}% confidence. Independent fact-checkers including ${publishers} found the claim to be false or misleading.`;

      case VERDICTS.MIXTURE:
        return `This claim contains a mixture of true and false information with ${confidence}% confidence. Fact-checks from ${publishers} indicate that parts of the claim are accurate while others are misleading.`;

      default:
        return `The claim was analyzed with ${confidence}% confidence, but a detailed explanation could not be generated.`;
    }
  }

  /**
   * Helper to truncate text
   */
  _truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  }

  /**
   * Helper to format publisher list
   */
  _formatList(list) {
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  }
}

export default new ExplanationService();