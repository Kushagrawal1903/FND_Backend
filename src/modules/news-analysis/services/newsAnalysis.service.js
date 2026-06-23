import llmService from '../../../services/llm/llm.service.js';
import AnalysisHistory from '../models/analysisHistory.model.js';
import logger from '../../../utils/logger.js';

class NewsAnalysisService {
  /**
   * Analyzes an article using LLM and persists the result
   * @param {string} newsText - The text to analyze
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} The analysis history record
   */
  async analyzeNews(newsText, userId = null) {
    console.log(`[SERVICE] Entered news analysis service`);
    console.log(`[SERVICE] Input received: "${newsText.substring(0, 100)}..."`);
    
    // Perform the LLM analysis
    const analysisResult = await llmService.analyzeNews(newsText);
    
    console.log(`[SERVICE] LLM analysis completed. Provider: ${analysisResult.provider}`);
    console.log(`[DATABASE] Save started for article analysis`);
    
    // Persist to database
    const historyRecord = await AnalysisHistory.create({
      userId,
      articleText: newsText,
      verdict: analysisResult.verdict,
      confidence: analysisResult.confidence,
      riskLevel: analysisResult.riskLevel,
      provider: analysisResult.provider,
      analysis: analysisResult,
    });
    
    console.log(`[DATABASE] Save completed. Document ID: ${historyRecord._id}`);
    return historyRecord;
  }
}

export default new NewsAnalysisService();
