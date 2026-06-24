import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { detectFakeNewsTool } from "../tools/detectFakeNews.tool.js";
import { analyzeTextTool } from "../tools/analyzeText.tool.js";
import { verifyUrlTool } from "../tools/verifyUrl.tool.js";
import { explainWithLLMTool } from "../tools/explainWithLLM.tool.js";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY,
});

export const agentExecutor = {
  async invoke({ input }) {
    let result;

    // URL detection
    if (input.startsWith("http://") || input.startsWith("https://")) {
      result = JSON.parse(
        await verifyUrlTool.invoke({
          url: input,
        })
      );

      return {
        type: "url_verification",
        result,
      };
    }

    // Long article detection
    if (input.split(" ").length > 50) {
      result = JSON.parse(
        await analyzeTextTool.invoke({
          text: input,
        })
      );

      return {
        type: "deep_analysis",
        result,
      };
    }

    // Normal claim verification
   const factCheck = JSON.parse(
  await detectFakeNewsTool.invoke(input)
);
console.log("INPUT:", input);
console.log("FACTCHECK:", factCheck);
  const response = await llm.invoke(`
You are an expert fake news analyst.

Claim:
"${input}"

Verification Result:
- Verdict: ${factCheck.verdict}
- Confidence: ${factCheck.confidence}%

Sources:
${JSON.stringify(factCheck.sources || [], null, 2)}

Generate:
1. Summary
2. Why this verdict was given
3. Important evidence
4. Recommendation
`);

const explanation = response.content;

   return {
  type: "claim_verification",
  claim: input,
  verdict: factCheck.verdict,
  confidence: factCheck.confidence,
  explanation,
};
  },
};