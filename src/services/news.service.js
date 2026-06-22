import axios from 'axios';
import claimExtractionService from './claimExtraction.service.js';
import googleFactCheckService from './googleFactCheck.service.js';
import credibilityService from './credibility.service.js';
import explanationService from './explanation.service.js';
import FactCheck from '../models/factCheck.model.js';
import { VERDICTS } from '../config/constants.js';

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
    // 1. Extract and clean the claim
    const refinedClaim = claimExtractionService.extractClaim(rawClaim);

    // 2. Query Google Fact Check API
    const googleClaims = await googleFactCheckService.searchClaims(refinedClaim);

    // 3. Compute credibility rating and confidence score
    const { verdict, confidence, sources } = credibilityService.calculateCredibility(googleClaims);

    // 4. Generate natural-language explanation
    const explanation = explanationService.generateExplanation(verdict, confidence, sources, refinedClaim);

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
