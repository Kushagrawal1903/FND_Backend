import fakeNewsWorkflow from '../../../agents/workflows/fakeNews.workflow.js';
import AnalysisHistory from '../models/analysisHistory.model.js';
import logger from '../../../utils/logger.js';

class NewsAnalysisService {
  /**
   * Analyzes an article using the agentic AI pipeline and persists the result.
   * Replaces the previous direct LLM call with a multi-agent orchestration.
   * @param {string} newsText - The text to analyze
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} The analysis result (combined AnalysisHistory + agentic data)
   */
  async analyzeNews(newsText, userId = null) {
    console.log('[SERVICE] Entered newsAnalysisService.analyzeNews (agentic mode)');
    logger.info(`[SERVICE] Entered news analysis service (agentic mode)`);

    // Run the full agentic pipeline
    const agenticResult = await fakeNewsWorkflow.analyzeArticle({
      articleText: newsText,
      userId,
    });

    // Map agentic verdict to AnalysisHistory enum (REAL/FAKE/MIXTURE/UNVERIFIED)
    const mappedVerdict = this._mapToLegacyVerdict(agenticResult.verdict);

    // Persist to AnalysisHistory for backward compatibility
    const historyRecord = await AnalysisHistory.create({
      userId,
      articleText: newsText,
      verdict: mappedVerdict,
      confidence: agenticResult.confidence,
      riskLevel: this._deriveRiskLevel(agenticResult),
      provider: 'agentic_pipeline',
      analysis: agenticResult,
    });

    logger.info(`[SERVICE] Agentic analysis saved. Document ID: ${historyRecord._id}`);

    // Attach the full agentic result so the controller can serialize it
    historyRecord._agenticResult = agenticResult;
    return historyRecord;
  }

  /**
   * Map extended agentic verdicts to the legacy AnalysisHistory enum.
   */
  _mapToLegacyVerdict(verdict) {
    const map = {
      'true': 'REAL',
      'likely_true': 'REAL',
      'false': 'FAKE',
      'likely_false': 'FAKE',
      'mixture': 'MIXTURE',
      'insufficient_evidence': 'UNVERIFIED',
      'unverified': 'UNVERIFIED',
    };
    return map[verdict] || 'UNVERIFIED';
  }

  /**
   * Derive risk level from agentic analysis.
   */
  _deriveRiskLevel(agenticResult) {
    const bias = agenticResult.biasAnalysis?.biasScore || 0;
    const confidence = agenticResult.confidence || 0;
    const verdict = agenticResult.verdict;

    if ((verdict === 'false' || verdict === 'likely_false') && confidence >= 70) return 'CRITICAL';
    if ((verdict === 'false' || verdict === 'likely_false') && bias >= 60) return 'HIGH';
    if (verdict === 'mixture' || bias >= 50) return 'MEDIUM';
    return 'LOW';
  }
}

export default new NewsAnalysisService();

