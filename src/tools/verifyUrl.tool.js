import { tool } from "@langchain/core/tools";
import newsService from "../services/news.service.js";

export const verifyUrlTool = tool(
  async ({ url }) => {
    const result = await newsService.verifyUrl(url);

    return JSON.stringify(result);
  },
  {
    name: "verify_url",
    description:
      "Verify credibility of a news article URL."
  }
);