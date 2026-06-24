/**
 * Agent Types & Constants
 * 
 * Central definitions for the NewsVerificationAgent framework.
 * All agent-related constants, enums, and JSDoc typedefs live here.
 * 
 * ────────────────────────────────────────────────────────────
 * SEQUENCE DIAGRAM — Full Agent Execution Flow
 * ────────────────────────────────────────────────────────────
 * 
 *  User Request
 *       │
 *       ▼
 *  NewsController.check()
 *       │
 *       ▼
 *  NewsService.verifyClaim()  ──[ENABLE_AGENT_MODE=false]──▶ Existing flow
 *       │
 *       └──[ENABLE_AGENT_MODE=true]
 *              │
 *              ▼
 *  VerificationService.verifyClaimWithAgent()
 *       │
 *       ├── ClaimExtractionService.extractClaim()
 *       │
 *       ▼
 *  AgentController.runVerification()
 *       │
 *       ▼
 *  NewsVerificationAgent.verify(claim)
 *       │
 *       ▼
 *  ┌─── Reasoning Loop (max MAX_ITERATIONS) ───┐
 *  │                                             │
 *  │  1. _buildPlanningPrompt(context)           │
 *  │  2. LLMService.generateText(prompt)         │
 *  │  3. _parseAgentResponse(rawText)            │
 *  │  4. If USE_TOOL:                            │
 *  │     → ToolRegistry.get(toolName)            │
 *  │     → tool.execute(input)                   │
 *  │     → Add result to context.evidence        │
 *  │     → Continue loop                         │
 *  │  5. If FINAL_ANSWER:                        │
 *  │     → Build VerificationResult              │
 *  │     → Return                                │
 *  │                                             │
 *  └─────────────────────────────────────────────┘
 *       │
 *       ▼
 *  VerificationService maps verdict → DB schema
 *       │
 *       ▼
 *  FactCheck.create()  →  Response to client
 * 
 * ────────────────────────────────────────────────────────────
 */

// ─── Agent Action Types ─────────────────────────────────────

/** Actions the agent can take during its reasoning loop */
export const AGENT_ACTIONS = Object.freeze({
  /** Agent wants to invoke a tool to gather evidence */
  USE_TOOL: 'USE_TOOL',
  /** Agent is ready to produce a final verdict */
  FINAL_ANSWER: 'FINAL_ANSWER',
});

// ─── Agent Verdict Values ───────────────────────────────────

/** Possible verdicts the agent can produce (richer than the existing VERDICTS) */
export const AGENT_VERDICTS = Object.freeze({
  TRUE: 'True',
  LIKELY_TRUE: 'Likely True',
  MIXED: 'Mixed',
  LIKELY_FALSE: 'Likely False',
  FALSE: 'False',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
});

/** All valid verdict strings for validation */
export const VALID_AGENT_VERDICTS = Object.freeze(Object.values(AGENT_VERDICTS));

// ─── Agent Configuration ────────────────────────────────────

/** Maximum number of reasoning iterations before the agent is forced to produce a verdict */
export const MAX_ITERATIONS = 5;

/** Maximum number of tool failures before the agent skips tool usage */
export const MAX_TOOL_FAILURES = 3;

// ─── JSDoc Type Definitions ────────────────────────────────

/**
 * @typedef {Object} Evidence
 * @property {string} toolName - Which tool produced this evidence
 * @property {string} input - The input that was sent to the tool
 * @property {any} result - The raw result from the tool
 * @property {string} timestamp - ISO timestamp of when the evidence was collected
 */

/**
 * @typedef {Object} Source
 * @property {string} name - Publisher or source name
 * @property {string} url - URL of the source
 * @property {string} [verdict] - The source's own verdict, if applicable
 */

/**
 * @typedef {Object} VerificationResult
 * @property {string} verdict - One of AGENT_VERDICTS values
 * @property {number} confidence - 0-100 confidence score
 * @property {string} summary - 1-2 sentence summary of the finding
 * @property {string[]} reasoning - Array of reasoning points supporting the verdict
 * @property {Evidence[]} evidence - All evidence collected during the reasoning loop
 * @property {Source[]} sources - All sources referenced in the verdict
 */

/**
 * @typedef {Object} AgentAction
 * @property {string} action - AGENT_ACTIONS.USE_TOOL or AGENT_ACTIONS.FINAL_ANSWER
 * @property {string} [tool] - Tool name (only when action is USE_TOOL)
 * @property {string} [toolInput] - Input for the tool (only when action is USE_TOOL)
 * @property {string} reasoning - Why the agent chose this action
 * @property {string} [verdict] - Final verdict (only when action is FINAL_ANSWER)
 * @property {number} [confidence] - Confidence score (only when action is FINAL_ANSWER)
 * @property {string} [summary] - Summary (only when action is FINAL_ANSWER)
 * @property {string[]} [verdictReasoning] - Reasoning points (only when action is FINAL_ANSWER)
 */

/**
 * @typedef {Object} AgentContext
 * @property {string} originalClaim - The raw claim text submitted by the user
 * @property {string} refinedClaim - The processed/extracted claim
 * @property {Evidence[]} evidence - Evidence collected so far
 * @property {string[]} toolsUsed - Names of tools already invoked
 * @property {number} iteration - Current iteration number
 * @property {string[]} reasoningLog - Log of reasoning steps
 * @property {number} toolFailures - Count of tool execution failures
 */

/**
 * @typedef {Object} ToolResult
 * @property {boolean} success - Whether the tool executed successfully
 * @property {any} data - The tool's result data
 * @property {string} [error] - Error message if the tool failed
 */

export default {
  AGENT_ACTIONS,
  AGENT_VERDICTS,
  VALID_AGENT_VERDICTS,
  MAX_ITERATIONS,
  MAX_TOOL_FAILURES,
};
