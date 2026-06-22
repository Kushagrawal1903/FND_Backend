import { VERDICTS } from '../config/constants.js';

/**
 * Service to generate human-readable explanations and summaries for fact-check results
 */
class ExplanationService {
  /**
   * Generates a structural natural-language explanation of a fact-check result
   * @param {string} verdict - The determined verdict
   * @param {number} confidence - The confidence percentage
   * @param {Array} sources - The list of evaluation sources
   * @param {string} originalClaim - The original claim submitted
   * @returns {string} The formatted explanation text
   */
  generateExplanation(verdict, confidence, sources, originalClaim) {
    if (verdict === VERDICTS.UNVERIFIED || !sources || sources.length === 0) {
      return `This claim ("${this._truncateText(originalClaim, 100)}") is currently UNVERIFIED. We did not find any official fact-check reports addressing this statement in our verified database. Please check for additional context or source documentation before sharing.`;
    }

    const uniquePublishers = [...new Set(sources.map(s => s.publisher))];
    const publishersListStr = this._formatList(uniquePublishers);

    let explanation = '';

    switch (verdict) {
      case VERDICTS.TRUE:
        explanation = `This claim is VERIFIED AS TRUE with ${confidence}% confidence. `;
        explanation += `Our analysis matched the claim against records from trusted fact-checking organizations (${publishersListStr}). `;
        explanation += `The consensus confirms that the claim is accurate and consistent with public records and scientific or historical consensus.`;
        break;

      case VERDICTS.FALSE:
        explanation = `This claim is VERIFIED AS FALSE with ${confidence}% confidence. `;
        explanation += `Independent fact-checkers from ${publishersListStr} have investigated this statement and concluded it is false, fabricated, or severely taken out of context. `;
        explanation += `Sharing this information without correction is misleading. Please consult the referenced sources for detailed refutations.`;
        break;

      case VERDICTS.MIXTURE:
        explanation = `This claim is a MIXTURE of true and false statements, rated with ${confidence}% confidence. `;
        explanation += `Reports from ${publishersListStr} indicate that while some aspects of the claim are true, other parts are incorrect, exaggerated, or missing critical context. `;
        explanation += `We recommend reviewing the sources closely to understand which specific assertions are supported and which are inaccurate.`;
        break;

      default:
        explanation = `This claim has been processed and returns an ambiguous verdict of "${verdict}" with ${confidence}% confidence. `;
        explanation += `Reviews by ${publishersListStr} are available, but their individual ratings do not align to a simple true/false category.`;
        break;
    }

    return explanation;
  }

  /**
   * Helper to truncate long text for display in explanations
   * @private
   */
  _truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  /**
   * Helper to format a list of items into a natural English list
   * @private
   */
  _formatList(list) {
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
  }
}

export default new ExplanationService();
