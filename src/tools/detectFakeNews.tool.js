import { tool } from "@langchain/core/tools";
import newsService from "../services/news.service.js";

export const detectFakeNewsTool = tool(
  async (input) => {
    const claim = typeof input === "string"
      ? input
      : input?.claim;

    const result = await newsService.verifyClaim(claim);

    return JSON.stringify({
      verdict: result.verdict,
      confidence: result.confidence,
      explanation: result.explanation,
      sources: result.sources || []
    });
  },
  {
    name: "detect_fake_news",
    description:
      "Verify whether a news claim is true, false, misleading, or unverified."
  }
);