import axios from 'axios';
import claimExtractionService from './claimExtraction.service.js';
import googleFactCheckService from './googleFactCheck.service.js';
import credibilityService from './credibility.service.js';
import explanationService from './explanation.service.js';
import FactCheck from '../models/factCheck.model.js';
import { VERDICTS } from '../config/constants.js';
import llmService from './llm/llm.service.js';
import { NotFoundError } from '../utils/errors.js';
import { config as appConfig } from '../config/env.js';
import fakeNewsWorkflow from '../agents/workflows/fakeNews.workflow.js';

/**
 * Service to orchestrate the Fake News Verification Flow
 */
class NewsService {
  /**
   * Run the standard verification flow on a text claim
   * @param {string} rawClaim - The claim text submitted by the user
   * @param {string|null} userId - The ID of the user submitting the check (if authenticated)
   * @returns {Promise<Object>} The saved FactCheck database record
   */
  async verifyClaim(rawClaim, userId = null) {
    console.log('[SERVICE] Entered legacy NewsService.verifyClaim');
    if (appConfig.enableAgentMode) {
      console.log('[NEWS SERVICE] Agent mode enabled (via ENABLE_AGENT_MODE). Redirecting check to Agentic workflow...');
      const agenticResult = await fakeNewsWorkflow.analyzeArticle({
        articleText: rawClaim,
        userId,
      });
      const factCheck = await FactCheck.findById(agenticResult.articleId);
      return factCheck;
    }
    // 1. Extract and clean the claim
    const refinedClaim = claimExtractionService.extractClaim(rawClaim);

    // 2. Query Google Fact Check API
    const googleClaims = await googleFactCheckService.searchClaims(refinedClaim);

    // 3. Compute credibility rating and confidence score
    let { verdict, confidence, sources } = credibilityService.calculateCredibility(googleClaims);

    // 4. Generate natural-language explanation
    let explanation;
    if (verdict === VERDICTS.UNVERIFIED || !sources || sources.length === 0) {
      try {
        console.log(`[NEWS SERVICE] Claim not verified via Google Fact Check. Falling back to LLM analysis...`);
        const llmResult = await llmService.analyzeNews(refinedClaim);
        
        let llmVerdict = String(llmResult.verdict).toLowerCase();
        let mappedVerdict = VERDICTS.UNVERIFIED;
        if (llmVerdict === 'real' || llmVerdict === 'true') {
          mappedVerdict = VERDICTS.TRUE;
        } else if (llmVerdict === 'fake' || llmVerdict === 'false') {
          mappedVerdict = VERDICTS.FALSE;
        } else if (llmVerdict === 'mixture') {
          mappedVerdict = VERDICTS.MIXTURE;
        }

        verdict = mappedVerdict;
        confidence = llmResult.confidence || 50;
        sources = [
          {
            publisher: `AI Engine (${llmResult.provider})`,
            url: 'https://truthlens.verify.info/ai-report',
            verdict: mappedVerdict
          }
        ];
        explanation = llmResult.summary || `AI Analysis determined this claim to be ${mappedVerdict} with ${confidence}% confidence.`;
      } catch (llmError) {
        console.error(`[NEWS SERVICE] LLM fallback analysis failed: ${llmError.message}`);
        explanation = explanationService.generateExplanation(verdict, confidence, sources, refinedClaim);
      }
    } else {
      explanation = explanationService.generateExplanation(verdict, confidence, sources, refinedClaim);
    }

    // 5. Save the results to MongoDB
    const factCheck = await FactCheck.create({
      userId,
      claim: refinedClaim,
      verdict,
      confidence,
      explanation,
      sources,
    });

    return factCheck;
  }

  /**
   * Run a deeper analysis on a text block, providing keyword breakdowns and metadata
   * @param {string} text - Longer content or article context
   * @param {string|null} userId - User ID
   * @returns {Promise<Object>} Verification results along with keyword analysis metadata
   */
  async analyzeText(text, userId = null) {
    console.log('[SERVICE] Entered legacy NewsService.analyzeText');
    // Verify the claim extracted from text
    const factCheckRecord = await this.verifyClaim(text, userId);

    // Also extract keywords to enrich the analysis response
    const keywords = claimExtractionService.extractKeywords(text, 5);

    return {
      verification: factCheckRecord,
      analysis: {
        extractedClaim: factCheckRecord.claim,
        keywords,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      },
    };
  }

  /**
   * Verify a URL by fetching its metadata/title and running verification on it
   * @param {string} url - The URL to check
   * @param {string|null} userId - User ID
   * @returns {Promise<Object>} Verification result of the URL article
   */
  async verifyUrl(url, userId = null) {
    let claimToVerify = url;

    try {
      // Attempt to fetch the website title to act as the claim
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 5000,
      });

      // Extract title from HTML
      const match = response.data.match(/<title>([^<]*)<\/title>/i);
      if (match && match[1]) {
        claimToVerify = match[1].trim();
      }
    } catch (error) {
      console.warn(`Could not fetch URL title for ${url}. Using domain name and URL as search query. Error: ${error.message}`);
      
      // Fallback: extract domain name
      try {
        const parsedUrl = new URL(url);
        claimToVerify = `${parsedUrl.hostname} article`;
      } catch (err) {
        claimToVerify = url;
      }
    }

    // Run standard verification on the extracted claim/title
    const factCheck = await this.verifyClaim(claimToVerify, userId);
    
    return {
      url,
      extractedTitle: claimToVerify,
      verification: factCheck,
    };
  }

  /**
   * Retrieve a specific fact-check record by ID
   * @param {string} id - The MongoDB ObjectId of the FactCheck
   * @returns {Promise<Object>} The FactCheck record
   */
  async getFactCheckById(id) {
    const factCheck = await FactCheck.findById(id);
    if (!factCheck) {
      throw new NotFoundError('Fact-check record not found');
    }
    return factCheck;
  }
}

export default new NewsService();
