import llmService from '../../../services/llm/llm.service.js';
import AnalysisHistory from '../models/analysisHistory.model.js';
import logger from '../../../utils/logger.js';
import { startTimer, stopTimer } from '../../../utils/timer.js';

class NewsAnalysisService {
  /**
   * Analyzes an article using LLM and persists the result
   * @param {string} newsText - The text to analyze
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} The analysis history record
   */
  async analyzeNews(newsText, userId = null) {
    const totalStart = startTimer();
    console.log(`[SERVICE] Entered news analysis service`);
    console.log(`[SERVICE] Input received: "${newsText.substring(0, 100)}..."`);
    
    // Perform the LLM analysis
    const llmStart = startTimer();
    const analysisResult = await llmService.analyzeNews(newsText);
    const llmAnalysisMs = stopTimer(llmStart);
    
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
    
    const totalMs = stopTimer(totalStart);
    const resultObject = historyRecord.toObject();
    resultObject.performance = {
      factCheckMs: 0.00,
      newsSearchMs: 0.00,
      webSearchMs: 0.00,
      credibilityMs: 0.00,
      llmAnalysisMs: Number(llmAnalysisMs.toFixed(2)),
      totalMs: Number(totalMs.toFixed(2))
    };

    return resultObject;
  }
}

export default new NewsAnalysisService();
