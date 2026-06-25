import axios from 'axios';
import { performance } from 'perf_hooks';
import claimExtractionService from './claimExtraction.service.js';
import googleFactCheckService from './googleFactCheck.service.js';
import credibilityService from './credibility.service.js';
import explanationService from './explanation.service.js';
import FactCheck from '../models/factCheck.model.js';
import { VERDICTS } from '../config/constants.js';
import aiOrchestrator from '../ai/orchestrator.js';

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
    const totalStart = performance.now();

    // 1. Measure Claim Extraction
    const startExtraction = performance.now();
    const refinedClaim = claimExtractionService.extractClaim(rawClaim);
    const durationExtraction = Math.round(performance.now() - startExtraction);

    let result;
    try {
      console.log(`[NewsService] Running orchestrated verification flow for: "${refinedClaim}"`);
      result = await aiOrchestrator.verifyClaimOrchestrated(rawClaim);
      
      if (result.metadata) {
        if (!result.metadata.timings) result.metadata.timings = {};
        result.metadata.timings.claimExtraction = durationExtraction;
      }
    } catch (error) {
      console.error(`[NewsService] Orchestrated flow failed. Running legacy fallback flow. Error:`, error.message);
      
      // Legacy rule-based matching fallback
      const startGoogle = performance.now();
      const googleClaims = await googleFactCheckService.searchClaims(refinedClaim);
      const durationGoogle = Math.round(performance.now() - startGoogle);

      const credibility = credibilityService.calculateCredibility(googleClaims);

      const startLlm = performance.now();
      const explanation = await explanationService.generateExplanation(
        credibility.verdict,
        credibility.confidence,
        credibility.sources,
        refinedClaim
      );
      const durationLlm = Math.round(performance.now() - startLlm);

      result = {
        claim: refinedClaim,
        verdict: credibility.verdict,
        confidence: credibility.confidence,
        explanation,
        sources: credibility.sources,
        metadata: {
          modelUsed: 'Legacy Fallback (Rule-Based)',
          sourcesChecked: ['Google Fact Check'],
          successfulSources: ['Google Fact Check'],
          failedSources: [],
          cached: false,
          timings: {
            claimExtraction: durationExtraction,
            googleFactCheck: durationGoogle,
            newsApi: 0,
            tavily: 0,
            mongoHistory: 0,
            aggregation: 0,
            llmReasoning: durationLlm,
          }
        },
      };
    }

    // Save results to MongoDB (including the new metadata field)
    const startDbSave = performance.now();
    const factCheck = await FactCheck.create({
      userId,
      claim: result.claim,
      verdict: result.verdict,
      confidence: result.confidence,
      explanation: result.explanation,
      sources: result.sources,
      metadata: result.metadata,
    });
    const durationDbSave = Math.round(performance.now() - startDbSave);
    const totalVerification = Math.round(performance.now() - totalStart);

    // Save final timings in the document
    if (factCheck.metadata && factCheck.metadata.timings) {
      factCheck.metadata.timings.databaseSave = durationDbSave;
      factCheck.metadata.timings.totalVerification = totalVerification;
      factCheck.markModified('metadata');
      await factCheck.save();
    }

    const timings = factCheck.metadata?.timings || {};
    console.log(`\nClaim Extraction: ${timings.claimExtraction || 0} ms`);
    console.log(`Google Fact Check: ${timings.googleFactCheck || 0} ms`);
    console.log(`NewsAPI: ${timings.newsApi || 0} ms`);
    console.log(`Tavily Search: ${timings.tavily || 0} ms`);
    console.log(`MongoDB History: ${timings.mongoHistory || 0} ms`);
    console.log(`Evidence Aggregation: ${timings.aggregation || 0} ms`);
    console.log(`LLM Reasoning: ${timings.llmReasoning || 0} ms`);
    console.log(`Database Save: ${timings.databaseSave || 0} ms`);
    console.log(`Total Verification Time: ${timings.totalVerification || 0} ms\n`);

    return factCheck;
  }

  /**
   * Run a deeper analysis on a text block, providing keyword breakdowns and metadata
   * @param {string} text - Longer content or article context
   * @param {string|null} userId - User ID
   * @returns {Promise<Object>} Verification results along with keyword analysis metadata
   */
  async analyzeText(text, userId = null) {
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
}

export default new NewsService();
