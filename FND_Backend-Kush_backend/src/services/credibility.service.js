import { VERDICTS } from '../config/constants.js';

/**
 * Service to evaluate credibility and calculate confidence scores
 */
class CredibilityService {
  /**
   * Normalizes the textual rating from fact-check publishers into a standard verdict
   * @param {string} rating - The raw text rating from publisher
   * @returns {string} One of VERDICTS constant values
   */
  normalizeRating(rating) {
    if (!rating) return VERDICTS.UNVERIFIED;
    
    const r = rating.toLowerCase().trim();

    // Map true ratings
    if (['true', 'correct', 'accurate', 'mostly true', 'correct attribution', 'verified'].some(k => r.includes(k))) {
      return VERDICTS.TRUE;
    }

    // Map false ratings
    if (['false', 'incorrect', 'untrue', 'fake', 'pants on fire', 'misleading', 'hoax', 'fabricated', 'out of context', 'distorted', 'not true'].some(k => r.includes(k))) {
      return VERDICTS.FALSE;
    }

    // Map mixture/half-truth ratings
    if (['mixture', 'mixed', 'half true', 'partly false', 'partly true', 'cherry picks', 'exaggerated', 'disputed'].some(k => r.includes(k))) {
      return VERDICTS.MIXTURE;
    }

    // Default to unverified
    return VERDICTS.UNVERIFIED;
  }

  /**
   * Evaluates the list of Google Fact Check claims to determine a final consensus verdict and confidence score.
   * @param {Array} googleClaims - Claims array returned by Google Fact Check API
   * @returns {Object} { verdict, confidence, sources }
   */
  calculateCredibility(googleClaims) {
    // If no claims/reviews were found, the claim is unverified
    if (!googleClaims || googleClaims.length === 0) {
      return {
        verdict: VERDICTS.UNVERIFIED,
        confidence: 0,
        sources: [],
      };
    }

    const sources = [];
    const verdictCounts = {
      [VERDICTS.TRUE]: 0,
      [VERDICTS.FALSE]: 0,
      [VERDICTS.MIXTURE]: 0,
      [VERDICTS.UNVERIFIED]: 0,
    };

    // Iterate through all claims and their reviews
    googleClaims.forEach((claim) => {
      if (claim.claimReview && Array.isArray(claim.claimReview)) {
        claim.claimReview.forEach((review) => {
          const publisherName = review.publisher?.name || review.publisher?.site || 'Unknown Source';
          const normalized = this.normalizeRating(review.textualRating);
          
          verdictCounts[normalized]++;
          
          sources.push({
            publisher: publisherName,
            url: review.url || '#',
            verdict: review.textualRating || 'Unrated',
          });
        });
      }
    });

    // If there were no actual reviews parsed
    if (sources.length === 0) {
      return {
        verdict: VERDICTS.UNVERIFIED,
        confidence: 0,
        sources: [],
      };
    }

    // Determine the majority verdict
    let finalVerdict = VERDICTS.UNVERIFIED;
    let maxCount = -1;

    Object.keys(verdictCounts).forEach((v) => {
      if (verdictCounts[v] > maxCount) {
        maxCount = verdictCounts[v];
        finalVerdict = v;
      }
    });

    // Calculate confidence score
    // Factors:
    // 1. Level of agreement (what % of sources agree with finalVerdict)
    // 2. Quantity of sources (more sources = higher confidence, up to a limit)
    const totalReviews = sources.length;
    const agreeingReviews = verdictCounts[finalVerdict];
    const agreementRatio = agreeingReviews / totalReviews;

    // Base confidence starts with agreement ratio
    let confidence = agreementRatio * 100;

    // Apply quantity adjustments:
    // Fewer sources reduces confidence since we have less data.
    // 1 source: max 75% confidence
    // 2 sources: max 85% confidence
    // 3+ sources: can reach up to 98% confidence depending on agreement
    if (totalReviews === 1) {
      confidence = Math.min(confidence, 75);
    } else if (totalReviews === 2) {
      confidence = Math.min(confidence, 85);
    } else {
      confidence = Math.min(confidence, 98);
    }

    // If final verdict is unverified, confidence should be low
    if (finalVerdict === VERDICTS.UNVERIFIED) {
      confidence = Math.min(confidence, 30);
    }

    return {
      verdict: finalVerdict,
      confidence: Math.round(confidence),
      sources: sources,
    };
  }
}

export default new CredibilityService();
