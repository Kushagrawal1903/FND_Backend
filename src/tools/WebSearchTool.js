import axios from 'axios';

class WebSearchTool {
  constructor() {
    this.name = 'WebSearchTool';
    this.description = 'Performs a general web search for information related to a claim. Returns web page titles, snippets, and URLs. Use this to find additional context, background information, or corroborating/contradicting evidence from across the web.';
  }

  /**
   * Execute the web search tool using Tavily API
   * @param {string} input - The search query
   * @returns {Promise<{results: Array, totalResults: number, searchQuery: string, error?: string}>}
   */
  async execute(input) {
    console.log(`[WEB SEARCH TOOL] Searching for: "${input}"`);

    // Read API key from process.env.TAVILY_API_KEY
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      const errorMsg = 'Tavily API key is not configured';
      console.error(`[WEB SEARCH TOOL] Error: ${errorMsg}`);
      return {
        results: [],
        totalResults: 0,
        error: errorMsg,
        searchQuery: input
      };
    }

    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: apiKey,
        query: input,
        search_depth: 'advanced',
        max_results: 5
      });

      const tavilyResults = response.data?.results || [];
      const results = tavilyResults.map(item => ({
        title: item.title || '',
        url: item.url || '',
        snippet: item.content || '',
        score: item.score || 0
      }));

      console.log(`[WEB SEARCH TOOL] Results found: ${results.length}`);

      return {
        results,
        totalResults: results.length,
        searchQuery: input
      };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error(`[WEB SEARCH TOOL] Error: ${errorMsg}`);
      return {
        results: [],
        totalResults: 0,
        error: errorMsg,
        searchQuery: input
      };
    }
  }
}

export default WebSearchTool;
