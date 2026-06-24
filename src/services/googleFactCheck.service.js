import axios from 'axios';
import { config } from '../config/env.js';

/**
 * Service to interact with the Google Fact Check Tools API
 */
class GoogleFactCheckService {
  constructor() {
    this.apiUrl = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';
  }

  /**
   * Search for fact-checking reports matching a query string
   * @param {string} query - The news claim to check
   * @returns {Promise<Array>} List of claims with reviews
   */
  async searchClaims(query) {
    const apiKey = config.google.factCheckApiKey;

    // Check if the API key is set to a placeholder
    if (!apiKey || apiKey.includes('YOUR_GOOGLE_FACT_CHECK_API_KEY')) {
      console.warn('Google Fact Check API Key is not configured. Falling back to simulated matching.');
      return this._simulateFactCheck(query);
    }

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          query: query,
          key: apiKey,
          languageCode: 'en',
        },
      });

      // Google Fact Check API returns { claims: [...] } or an empty object if no matches
     const claims = response.data.claims || [];

const filteredClaims = claims.filter((claim) => {
  if (!claim.text) return false;

  const claimText = claim.text.toLowerCase();
  const searchText = query.toLowerCase();

  return (
    claimText.includes(searchText) ||
    searchText.includes(claimText)
  );
});

return filteredClaims;
    } catch (error) {
      console.error('Google Fact Check API request failed:', error.message);
      // Fallback to simulation to maintain service availability
      console.warn('Falling back to simulated matching due to API error.');
      return this._simulateFactCheck(query);
    }
  }

  /**
   * Simulates fact check response based on keywords for offline testing/development
   * @private
   */
  _simulateFactCheck(query) {
    const normalized = query.toLowerCase();
    
    // Simple rules for generating realistic-looking simulated results
    const mockClaims = [
      {
        text: "COVID-19 vaccines contain microchips for tracking population.",
        claimant: "Social Media Posts",
        claimReview: [
          {
            publisher: { name: "PolitiFact" },
            url: "https://www.politifact.com/factchecks/2021/c19-microchips/",
            title: "No, COVID-19 vaccines do not contain microchips",
            textualRating: "False"
          },
          {
            publisher: { name: "FactCheck.org" },
            url: "https://www.factcheck.org/2021/vaccines-microchips/",
            title: "Fact checking microchip vaccine claims",
            textualRating: "False"
          }
        ]
      },
      {
        text: "NASA confirmed the Earth is flat in a recent report.",
        claimant: "Flat Earth Blog",
        claimReview: [
          {
            publisher: { name: "Snopes" },
            url: "https://www.snopes.com/fact-check/nasa-flat-earth-report/",
            title: "Did NASA confirm flat earth?",
            textualRating: "False"
          }
        ]
      },
      {
        text: "Drinking warm water kills viruses in your throat.",
        claimant: "WhatsApp Broadcast",
        claimReview: [
          {
            publisher: { name: "WHO Fact Checker" },
            url: "https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters",
            title: "Drinking water myth busters",
            textualRating: "False"
          }
        ]
      }
    ];

    // Try to match keywords
    const matches = mockClaims.filter(c => 
      c.text.toLowerCase().split(' ').some(word => word.length > 4 && normalized.includes(word))
    );

    if (matches.length > 0) {
      return matches;
    }

    // Default simulated response if no keywords match, representing an unverified claim
    return [];
  }
}

export default new GoogleFactCheckService();
