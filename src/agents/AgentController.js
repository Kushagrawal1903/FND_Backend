/**
 * AgentController
 * 
 * Thin orchestrator that manages the lifecycle of a NewsVerificationAgent.
 * Handles Dependency Injection (LLM Service and Tool Registry), sets up execution
 * contexts, measures processing latency, and formats final payloads.
 * 
 * WHY THIS EXISTS:
 * Rather than letting services or controllers directly construct the agent
 * and its dependencies, AgentController serves as a clean entry point. It wraps
 * the agent invocation in try/catch blocks and gathers diagnostics (runtime/performance)
 * for audit logs.
 */

import ToolRegistry from '../tools/ToolRegistry.js';
import NewsVerificationAgent from './NewsVerificationAgent.js';
import llmService from '../services/llm/llm.service.js';

class AgentController {
  /**
   * Run the verification loop for a claim
   * @param {string} rawClaim - The raw text of the claim submitted by the user
   * @param {string} refinedClaim - The extracted core claim to search against
   * @returns {Promise<import('./AgentTypes.js').VerificationResult>}
   */
  async runVerification(rawClaim, refinedClaim) {
    const startTime = Date.now();
    console.log(`[AGENT CONTROLLER] Initializing verification loop...`);

    try {
      // 1. Dependency Injection: Create a fresh ToolRegistry loaded with all default tools
      const toolRegistry = ToolRegistry.createDefault();

      // 2. Instantiate the agent with its dependencies
      const agent = new NewsVerificationAgent({
        llmService,
        toolRegistry,
      });

      // 3. Execute the autonomous loop
      const result = await agent.verify(rawClaim, refinedClaim);

      const durationMs = Date.now() - startTime;
      console.log(`[AGENT CONTROLLER] Verification completed in ${durationMs}ms. Verdict: "${result.verdict}" (Confidence: ${result.confidence}%)`);

      // Add simple diagnostics to the result object
      return {
        ...result,
        diagnostics: {
          durationMs,
          iterations: result.evidence.length,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`[AGENT CONTROLLER] Critical failure in agent loop after ${durationMs}ms: ${error.message}`);
      
      // Fallback response inside the controller boundary
      return {
        verdict: 'Insufficient Evidence',
        confidence: 0,
        summary: `Verification failed during execution: ${error.message}`,
        reasoning: [`An error occurred inside the agent runtime: ${error.message}`],
        evidence: [],
        sources: [],
        diagnostics: {
          durationMs,
          iterations: 0,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

export default new AgentController();
