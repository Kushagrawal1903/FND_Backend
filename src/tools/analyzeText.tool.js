import { tool } from "@langchain/core/tools";
import newsService from "../services/news.service.js";

export const analyzeTextTool = tool(
  async ({ text }) => {
    const result = await newsService.analyzeText(text);

    return JSON.stringify(result);
  },
  {
    name: "analyze_text",
    description:
      "Perform deep analysis of a news article and extract keywords."
  }
);