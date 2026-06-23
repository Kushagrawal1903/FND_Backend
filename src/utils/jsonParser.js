/**
 * Safe JSON Parser Utility
 */

/**
 * Safely extracts and parses JSON from a string, handling common LLM output issues
 * like markdown code blocks or conversational wrappers.
 *
 * @param {string} rawText - The raw response text from the LLM
 * @returns {Object|null} The parsed JSON object, or null if parsing fails
 */
export const safeParseJSON = (rawText) => {
  if (!rawText) return null;

  try {
    // Try parsing the raw text directly first
    return JSON.parse(rawText);
  } catch (error) {
    // If direct parsing fails, try to extract JSON from markdown or wrappers
    try {
      // Find the first '{' and the last '}'
      const startIndex = rawText.indexOf('{');
      const endIndex = rawText.lastIndexOf('}');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const jsonString = rawText.substring(startIndex, endIndex + 1);
        return JSON.parse(jsonString);
      }
      return null;
    } catch (innerError) {
      console.error('Failed to parse JSON from LLM response:', innerError.message);
      return null;
    }
  }
};

/**
 * Normalizes the parsed LLM response to ensure it exactly matches the required schema
 * @param {Object} parsed - The parsed JSON object
 * @param {string} providerName - The name of the LLM provider
 * @returns {Object} A normalized response object
 */
export const normalizeAnalysisResponse = (parsed, providerName) => {
  const defaultResponse = {
    verdict: 'UNVERIFIED',
    confidence: 0,
    riskLevel: 'LOW',
    summary: 'Analysis failed or returned invalid format.',
    reasoning: [],
    claims: [],
    redFlags: [],
    sourceReliability: {
      score: 0,
      analysis: 'Not evaluated',
    },
    recommendation: 'Unable to provide recommendation due to analysis failure.',
    provider: providerName,
  };

  if (!parsed || typeof parsed !== 'object') {
    return defaultResponse;
  }

  // Ensure valid verdict
  const validVerdicts = ['REAL', 'FAKE', 'MIXTURE', 'UNVERIFIED'];
  let verdict = parsed.verdict?.toUpperCase();
  if (!validVerdicts.includes(verdict)) {
    verdict = 'UNVERIFIED';
  }

  // Ensure confidence is a number between 0 and 100
  let confidence = Number(parsed.confidence);
  if (isNaN(confidence)) confidence = 0;
  confidence = Math.min(Math.max(confidence, 0), 100);

  // Ensure riskLevel is valid
  const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let riskLevel = parsed.riskLevel?.toUpperCase();
  if (!validRisks.includes(riskLevel)) {
    riskLevel = 'LOW';
  }

  return {
    verdict: verdict,
    confidence: confidence,
    riskLevel: riskLevel,
    summary: parsed.summary || defaultResponse.summary,
    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
    claims: Array.isArray(parsed.claims) ? parsed.claims : [],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    sourceReliability: {
      score: Number(parsed.sourceReliability?.score) || 0,
      analysis: parsed.sourceReliability?.analysis || 'Not evaluated',
    },
    recommendation: parsed.recommendation || defaultResponse.recommendation,
    provider: providerName,
  };
};

export default {
  safeParseJSON,
  normalizeAnalysisResponse,
};
