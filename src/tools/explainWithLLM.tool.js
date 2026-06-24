import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

export const explainWithLLMTool = tool(
  async (input) => {

    const claim = input?.claim || "";
    const verdict = input?.verdict || "";
    const confidence = input?.confidence || 0;
    const sources = input?.sources || [];

    const prompt = `
You are an expert fake news analyst.

Claim:
"${claim}"

Verification Result:
- Verdict: ${verdict}
- Confidence: ${confidence}%

Sources:
${JSON.stringify(sources, null, 2)}

Generate a response in the following format:

1. Summary
2. Why this verdict was given
3. Important evidence
4. Recommendation for the user

Keep the explanation simple and easy to understand.
`;

    const response = await llm.invoke(prompt);

    return response.content;
  },
  {
    name: "explain_with_llm",
    description:
      "Generate a detailed natural language explanation for a fact-check result using Gemini.",
  }
);