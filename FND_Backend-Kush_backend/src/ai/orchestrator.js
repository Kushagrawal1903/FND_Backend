import axios from 'axios';
import { performance } from 'perf_hooks';
import { config } from '../config/env.js';
import googleFactCheckService from '../services/googleFactCheck.service.js';
import claimExtractionService from '../services/claimExtraction.service.js';
import FactCheck from '../models/factCheck.model.js';
import geminiProvider from './gemini.provider.js';
import groqProvider from './groq.provider.js';
import cache from './cache.js';
import { REASONING_SYSTEM_PROMPT, getReasoningUserPrompt } from './prompts/reasoning.prompt.js';

/**
 * Runs a promise against a timeout, returning a default fallback value if it times out or errors.
 * @param {Promise<any>} promise 
 * @param {number} ms 
 * @param {string} sourceName 
 * @param {any} defaultValue 
 * @returns {Promise<{status: string, data: any, error?: string}>}
 */
const withTimeout = (promise, ms, sourceName, defaultValue = []) => {
  const startTime = performance.now();
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Orchestrator] Source '${sourceName}' timed out after ${ms}ms.`);
      resolve({ status: 'timeout', data: defaultValue, duration: Math.round(performance.now() - startTime) });
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return { status: 'success', data: res, duration: Math.round(performance.now() - startTime) };
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error(`[Orchestrator] Source '${sourceName}' failed:`, err.message);
      return { status: 'failed', error: err.message, data: defaultValue, duration: Math.round(performance.now() - startTime) };
    }),
    timeoutPromise
  ]);
};

/**
 * Queries NewsAPI for related articles
 */
async function queryNewsApi(query) {
  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q: query,
      apiKey: config.news.apiKey,
      pageSize: 5,
      language: 'en',
    },
    timeout: 3500,
  });
  if (response.data && Array.isArray(response.data.articles)) {
    return response.data.articles.map(art => ({
      title: art.title,
      description: art.description,
      url: art.url,
      sourceName: art.source?.name || 'Unknown News Source',
    }));
  }
  return [];
}

async function queryTavily(query) {
  const startTime = performance.now();
  console.log(`[Tavily Search] Request start for query: "${query}"`);
  
  try {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: config.tavily.apiKey,
        query: query,
        max_results: 5,
      },
      {
        timeout: 10000,
      }
    );

    const duration = Math.round(performance.now() - startTime);
    console.log(`[Tavily Search] Request successful. HTTP status: ${response.status}. Response time: ${duration}ms`);

    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results.map(res => ({
        title: res.title,
        content: res.content,
        url: res.url,
      }));
    }
    return [];
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    let errorType = 'Network/Unknown Error';
    let responseBody = '';

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorType = 'Timeout Error';
    } else if (error.response) {
      const status = error.response.status;
      responseBody = JSON.stringify(error.response.data);
      if (status === 401 || status === 403) {
        errorType = 'Authentication Error';
      } else if (status === 429) {
        errorType = 'Rate-Limit Error';
      } else {
        errorType = `HTTP Error ${status}`;
      }
    } else if (error.request) {
      errorType = 'Network Error (No response received)';
    }

    console.error(`[Tavily Search] Request failed after ${duration}ms. Type: ${errorType}. Message: ${error.message}`);
    if (responseBody) {
      console.error(`[Tavily Search] Error response body: ${responseBody}`);
    }

    throw error;
  }
}

/**
 * Queries local MongoDB history for similar claim checks
 */
async function queryMongoHistory(queryText) {
  const keywords = claimExtractionService.extractKeywords(queryText, 3);
  let query = {};
  if (keywords && keywords.length > 0) {
    query = {
      $or: keywords.map(kw => ({ claim: new RegExp(kw, 'i') }))
    };
  } else {
    query = { claim: new RegExp(queryText, 'i') };
  }
  return await FactCheck.find(query).limit(5).lean();
}

/**
 * Extracts and cleans a JSON block from LLM raw output text.
 * @param {string} text 
 * @returns {Object}
 */
function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try regex markdown extraction
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (err) {
        // Continue fallback search
      }
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (err) {
        // Fallback search failed
      }
    }
    throw new Error('Could not parse JSON response from LLM text output');
  }
}

class AIOrchestrator {
  /**
   * Run parallel verification flow across 4 sources, feed evidence to LLM, and return structured result
   * @param {string} rawClaim 
   * @returns {Promise<Object>} Verification results with metadata
   */
  async verifyClaimOrchestrated(rawClaim) {
    const refinedClaim = claimExtractionService.extractClaim(rawClaim);

    // 1. Check local cache
    const cachedResult = cache.get(refinedClaim);
    if (cachedResult) {
      console.log(`[Orchestrator] Cache hit for claim: "${refinedClaim}"`);
      return {
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          cached: true,
          timings: {
            claimExtraction: 0,
            googleFactCheck: 0,
            newsApi: 0,
            tavily: 0,
            mongoHistory: 0,
            aggregation: 0,
            llmReasoning: 0,
            databaseSave: 0,
            totalVerification: 0,
          }
        }
      };
    }

    const sourcesChecked = [];
    const promises = [];

    // --- Prepare parallel promises ---
    
    // Google Fact Check (always queried)
    sourcesChecked.push('Google Fact Check');
    promises.push(
      withTimeout(
        googleFactCheckService.searchClaims(refinedClaim),
        4000,
        'Google Fact Check',
        []
      )
    );

    // NewsAPI (queried only if API key present)
    sourcesChecked.push('NewsAPI');
    if (config.news.apiKey) {
      promises.push(
        withTimeout(
          queryNewsApi(refinedClaim),
          4000,
          'NewsAPI',
          []
        )
      );
    } else {
      promises.push(Promise.resolve({ status: 'skipped', reason: 'API key not configured', data: [], duration: 0 }));
    }

    // Tavily Search (queried only if API key present)
    sourcesChecked.push('Tavily Search');
    if (config.tavily.apiKey) {
      promises.push(
        withTimeout(
          queryTavily(refinedClaim),
          10000,
          'Tavily Search',
          []
        )
      );
    } else {
      promises.push(Promise.resolve({ status: 'skipped', reason: 'API key not configured', data: [], duration: 0 }));
    }

    // MongoDB Local History (always queried)
    sourcesChecked.push('MongoDB Local History');
    promises.push(
      withTimeout(
        queryMongoHistory(refinedClaim),
        3000,
        'MongoDB Local History',
        []
      )
    );

    // --- Run parallel fetch ---
    const [googleResult, newsResult, tavilyResult, mongoResult] = await Promise.all(promises);

    const successfulSources = [];
    const failedSources = [];

    const verifyStatus = (res, name) => {
      if (res.status === 'success') {
        successfulSources.push(name);
      } else if (res.status === 'failed' || res.status === 'timeout') {
        failedSources.push(name);
      }
    };

    verifyStatus(googleResult, 'Google Fact Check');
    verifyStatus(newsResult, 'NewsAPI');
    verifyStatus(tavilyResult, 'Tavily Search');
    verifyStatus(mongoResult, 'MongoDB Local History');

    // --- Aggregate Evidence into text string ---
    const startAggregation = performance.now();
    let evidenceText = '';

    // Add source weights header at the top
    evidenceText += `Source Weighting Guidelines (authority hierarchy):
1. Google Fact Check Tools API (Highest authority: verified reviews)
2. NewsAPI (High authority: mainstream press publication content)
3. Tavily Search (Medium authority: general web search snippets)
4. MongoDB Local History (Medium authority: locally archived past checks)\n\n`;

    let reviewCount = 0;
    if (googleResult.data && googleResult.data.length > 0) {
      let tempText = '';
      for (const claim of googleResult.data) {
        if (reviewCount >= 2) break;
        if (claim.claimReview && Array.isArray(claim.claimReview)) {
          const relevantReviews = [];
          for (const rev of claim.claimReview) {
            if (reviewCount >= 2) break;
            relevantReviews.push(rev);
            reviewCount++;
          }
          if (relevantReviews.length > 0) {
            tempText += `[Fact Check (Claim: "${claim.text}")]:\n`;
            relevantReviews.forEach((rev) => {
              tempText += `  - Publisher: ${rev.publisher?.name || 'Unknown'}\n`;
              tempText += `    Publisher Verdict: ${rev.textualRating || 'Unrated'}\n`;
              tempText += `    URL: ${rev.url || '#'}\n`;
            });
          }
        }
      }
      if (tempText) {
        evidenceText += `--- SOURCE: Google Fact Check Tools API (Max 2 Reviews) ---\n` + tempText + `\n`;
      }
    }

    if (newsResult.data && newsResult.data.length > 0) {
      evidenceText += `--- SOURCE: NewsAPI Articles (Max 2 Articles) ---\n`;
      newsResult.data.slice(0, 2).forEach((art, idx) => {
        evidenceText += `[News Article ${idx + 1}]: "${art.title}" (Source: ${art.sourceName})\n`;
        const desc = art.description ? (art.description.length > 200 ? art.description.substring(0, 200) + '...' : art.description) : 'No description';
        evidenceText += `  - Summary: ${desc}\n`;
        evidenceText += `    URL: ${art.url || '#'}\n`;
      });
      evidenceText += `\n`;
    }

    if (tavilyResult.data && tavilyResult.data.length > 0) {
      evidenceText += `--- SOURCE: Tavily Search results (Max 2 Results) ---\n`;
      tavilyResult.data.slice(0, 2).forEach((web, idx) => {
        evidenceText += `[Web Search ${idx + 1}]: "${web.title}"\n`;
        const content = web.content ? (web.content.length > 250 ? web.content.substring(0, 250) + '...' : web.content) : 'No content';
        evidenceText += `  - Summary: ${content}\n`;
        evidenceText += `    URL: ${web.url || '#'}\n`;
      });
      evidenceText += `\n`;
    }

    if (mongoResult.data && mongoResult.data.length > 0) {
      evidenceText += `--- SOURCE: MongoDB Local Verification History (Max 1 Verification) ---\n`;
      mongoResult.data.slice(0, 1).forEach((fc) => {
        evidenceText += `[Previous Local Verification]: "${fc.claim}"\n`;
        evidenceText += `  - Verdict: ${fc.verdict} (Confidence: ${fc.confidence}%)\n`;
        const explanation = fc.explanation ? (fc.explanation.length > 200 ? fc.explanation.substring(0, 200) + '...' : fc.explanation) : 'No explanation';
        evidenceText += `  - Explanation: ${explanation}\n`;
        evidenceText += `    Source publishers: ${fc.sources?.map(s => s.publisher).join(', ') || 'None'}\n`;
      });
      evidenceText += `\n`;
    }

    const hasActualData = 
      googleResult.data.length > 0 ||
      newsResult.data.length > 0 ||
      tavilyResult.data.length > 0 ||
      mongoResult.data.length > 0;

    if (!hasActualData) {
      evidenceText += `No external evidence or previous verifications were found for this claim.`;
    }

    // Log evidence length and truncate if too large (e.g. > 10,000 characters)
    console.log(`[Orchestrator] Combined evidence text length: ${evidenceText.length} characters.`);
    if (evidenceText.length > 10000) {
      console.warn(`[Orchestrator] Evidence is too large (${evidenceText.length} chars). Truncating to 10000 chars to avoid high API latency/timeouts.`);
      evidenceText = evidenceText.substring(0, 10000) + '\n... [Evidence truncated due to size limits] ...';
    }

    const durationAggregation = Math.round(performance.now() - startAggregation);

    const userPrompt = getReasoningUserPrompt(refinedClaim, evidenceText);
    console.log(`[Orchestrator] Generated prompt size: UserPrompt = ${userPrompt.length} chars, SystemPrompt = ${REASONING_SYSTEM_PROMPT.length} chars.`);

    // --- LLM Reasoning and Fallback execution ---
    const startLlm = performance.now();
    let llmResult;
    let modelUsed = '';

    try {
      console.log(`[Orchestrator] Invoking Gemini (Primary)...`);
      const response = await geminiProvider.generate(
        REASONING_SYSTEM_PROMPT,
        userPrompt
      );
      llmResult = extractJson(response.text);
      modelUsed = `Gemini (${response.model})`;
    } catch (geminiError) {
      console.warn(`[Orchestrator] Gemini failed. Falling back to Groq... Error: ${geminiError.message}`);
      try {
        const response = await groqProvider.generate(
          REASONING_SYSTEM_PROMPT,
          getReasoningUserPrompt(refinedClaim, evidenceText)
        );
        llmResult = extractJson(response.text);
        modelUsed = `Groq (${response.model})`;
      } catch (groqError) {
        console.error(`[Orchestrator] Groq fallback failed: ${groqError.message}`);
        throw new Error(`Both primary and fallback LLMs failed: ${groqError.message}`);
      }
    }
    const durationLlm = Math.round(performance.now() - startLlm);

    // --- Sanitize and Normalize LLM output ---
    const verdict = (llmResult.verdict || 'unverified').toLowerCase();
    const confidence = Math.min(100, Math.max(0, parseInt(llmResult.confidence, 10) || 0));
    const explanation = llmResult.explanation || 'No explanation generated.';
    const sources = Array.isArray(llmResult.sources)
      ? llmResult.sources.map(s => ({
          publisher: s.publisher || 'Unknown Source',
          url: s.url || '#',
          verdict: s.verdict || 'Source Context'
        }))
      : [];

    const finalResult = {
      claim: refinedClaim,
      verdict,
      confidence,
      explanation,
      sources,
      metadata: {
        modelUsed,
        sourcesChecked,
        successfulSources,
        failedSources,
        cached: false,
        timings: {
          googleFactCheck: googleResult.duration || 0,
          newsApi: newsResult.duration || 0,
          tavily: tavilyResult.duration || 0,
          mongoHistory: mongoResult.duration || 0,
          aggregation: durationAggregation,
          llmReasoning: durationLlm,
        }
      }
    };

    // Cache the successful result
    cache.set(refinedClaim, finalResult);

    return finalResult;
  }
}

export default new AIOrchestrator();
