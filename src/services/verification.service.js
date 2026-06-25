/**
 * VerificationService
 * 
 * Orchestration service that bridges the existing controller layer with the agentic
 * verification flow. Receives verification requests, extracts claims, triggers the
 * master agent orchestrator, maps the agent results to the database schema,
 * and persists them.
 * 
 * WHY THIS EXISTS:
 * This service encapsulates the agent integration. By putting the agent invocation
 * behind a service, the existing controller layer remains completely unchanged,
 * keeping the controller API surface clean and backward compatible.
 * 
 * REUSES:
 * - claimExtractionService.extractClaim()
 * - FactCheck (mongoose model)
 */

import claimExtractionService from './claimExtraction.service.js';
import agentOrchestrator from '../orchestrator/agent.orchestrator.js';
import FactCheck from '../models/factCheck.model.js';
import { VERDICTS } from '../config/constants.js';

class VerificationService {
  /**
   * Run agentic verification on a text claim and persist to database
   * @param {string} rawClaim - The claim text submitted by the user
   * @param {string|null} userId - The ID of the authenticated user (if any)
   * @returns {Promise<Object>} The saved FactCheck database record
   */
  async verifyClaimWithAgent(rawClaim, userId = null) {
    console.log(`[VERIFICATION SERVICE] Starting agentic flow for claim...`);

    // 1. Extract core claim
    const refinedClaim = claimExtractionService.extractClaim(rawClaim);

    // 2. Delegate to the master orchestrator. The orchestrator is the only module
    // coordinating agents and owns retries, state, and execution history.
    const agentResult = await agentOrchestrator.verify({
      originalInput: rawClaim,
      refinedClaim,
    });

    // 3. Map Agent verdicts to existing database VERDICTS schema
    const mappedVerdict = this._mapAgentVerdictToDb(agentResult.verdict);

    // 4. Transform agent sources to match database source schema
    const references = agentResult.references || [];
    const mappedSources = references.map(src => ({
      publisher: src.publisher || src.name || 'Referenced Source',
      url: src.url,
      verdict: src.verdict || 'Unrated',
    })).filter(src => src.url);

    // If there were no sources, add a placeholder indicating the agent did the review
    if (mappedSources.length === 0) {
      mappedSources.push({
        publisher: 'AgentOrchestrator',
        url: 'https://truthlens.verify.info/agent-report',
        verdict: agentResult.verdict,
      });
    }

    console.log(`[VERIFICATION SERVICE] Agent finished. Mapped verdict: "${mappedVerdict}" (Confidence: ${agentResult.confidence}%)`);

    // 5. Save to MongoDB using existing FactCheck model
    const factCheck = await FactCheck.create({
      userId,
      claim: refinedClaim,
      verdict: mappedVerdict,
      confidence: agentResult.confidence,
      explanation: agentResult.summary,
      sources: mappedSources,
    });

    // Attach agent reasoning context to the returned object so that it could be returned
    // by the controller or logged without database schema changes
    const resultObject = factCheck.toObject();
    resultObject.agentDetails = {
      rawVerdict: agentResult.verdict,
      reasoning: agentResult.reasoning,
      evidence: agentResult.evidence,
      credibility: agentResult.credibility,
      executionMetadata: agentResult.executionMetadata,
      workflowState: agentResult.workflowState,
    };
    resultObject.timings = agentResult.timings;

    this._assertSerializable(resultObject, 'VerificationService result');

    return resultObject;
  }

  /**
   * Maps rich agent verdicts to the simpler database enum values
   * @param {string} agentVerdict 
   * @returns {string} One of VERDICTS values ('true', 'false', 'mixture', 'unverified')
   * @private
   */
  _mapAgentVerdictToDb(agentVerdict) {
    switch (agentVerdict) {
      case 'True':
      case 'Likely True':
        return VERDICTS.TRUE;
      case 'False':
      case 'Likely False':
        return VERDICTS.FALSE;
      case 'Mixed':
        return VERDICTS.MIXTURE;
      default:
        return VERDICTS.UNVERIFIED;
    }
  }

  _assertSerializable(value, label) {
    try {
      JSON.stringify(value);
    } catch (error) {
      throw new Error(`${label} is not JSON serializable. Circular reference or unsupported value detected: ${error.message}`);
    }
  }
}

export default new VerificationService();
