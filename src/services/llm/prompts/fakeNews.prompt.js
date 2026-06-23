/**
 * Prompt Builder for Fake News Analysis
 */

export const buildAnalysisPrompt = (newsText) => {
  return `You are an expert investigative journalist, fact checker, media analyst, and misinformation expert.
Your task is to analyze the following news article or claim for factual accuracy, credibility, and potential misinformation.

Analyze the text and provide your response STRICTLY as a valid JSON object matching the EXACT schema below. 
Do not include any Markdown formatting (like \`\`\`json) or any conversational text before or after the JSON.

REQUIRED JSON SCHEMA:
{
  "verdict": "REAL" | "FAKE" | "MIXTURE" | "UNVERIFIED",
  "confidence": <number between 0 and 100>,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "<1-2 sentence summary of what the text is claiming>",
  "reasoning": [
    "<point 1 explaining the verdict>",
    "<point 2 explaining the verdict>"
  ],
  "claims": [
    "<major claim 1 extracted from text>",
    "<major claim 2 extracted from text>"
  ],
  "redFlags": [
    "<detected sensational language, emotional manipulation, logical fallacies, etc.>"
  ],
  "sourceReliability": {
    "score": <number between 0 and 100>,
    "analysis": "<brief analysis of the apparent source credibility and factual consistency>"
  },
  "recommendation": "<advice for the reader regarding this text>"
}

INSTRUCTIONS FOR ANALYSIS:
1. "verdict": Determine if the text is entirely true (REAL), entirely false (FAKE), contains a mix of truth and falsehoods (MIXTURE), or cannot be verified (UNVERIFIED).
2. "confidence": How confident are you in this verdict? (0-100)
3. "riskLevel": How dangerous is this misinformation if believed? (LOW = harmless, CRITICAL = potential harm to health, safety, or democracy)
4. "summary": Briefly state what the text is about.
5. "reasoning": Provide specific reasons for your verdict based on facts, logical consistency, and typical misinformation patterns.
6. "claims": Extract the main verifiable assertions made in the text.
7. "redFlags": Identify manipulative tactics like clickbait headlines, extreme emotional appeals, lack of specific details, or known conspiracy tropes.
8. "sourceReliability": Evaluate if the text reads like professional journalism or an unreliable source.
9. "recommendation": E.g., "Verify with independent fact-checkers", "Safe to share", "Do not share".

TEXT TO ANALYZE:
---
${newsText}
---

Remember: Return ONLY valid JSON matching the schema. No other text.`;
};

export default {
  buildAnalysisPrompt
};
