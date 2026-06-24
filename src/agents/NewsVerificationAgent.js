/**
 * NewsVerificationAgent
 * 
 * An autonomous, single-agent reasoning loop designed to verify claims
 * by selecting, executing, and evaluating evidence from multiple tools.
 * 
 * Operates in a ReAct (Reasoning & Action) loop:
 * Input Claim → Plan/Reason → Select Tool → Execute Tool → Collect Evidence → Repeat (Max 5) → Final Verdict
 * 
 * Reuses:
 * - llmService.generateText() for generic reasoning/planning prompts.
 * - safeParseJSON() from utils/jsonParser.js for cleaning LLM responses.
 */

import { AGENT_ACTIONS, AGENT_VERDICTS, MAX_ITERATIONS, MAX_TOOL_FAILURES } from './AgentTypes.js';
import { safeParseJSON } from '../utils/jsonParser.js';
import { startTimer, stopTimer } from '../utils/timer.js';

class NewsVerificationAgent {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.llmService - The LLM provider-agnostic service wrapper
   * @param {Object} dependencies.toolRegistry - The registry of available tools
   */
  constructor({ llmService, toolRegistry }) {
    this.llmService = llmService;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Main entry point to verify a claim
   * @param {string} rawClaim - The claim to verify
   * @param {string} refinedClaim - The extracted core claim
   * @returns {Promise<import('./AgentTypes.js').VerificationResult>}
   */
  async verify(rawClaim, refinedClaim) {
    console.log(`[AGENT] Starting verification for claim: "${refinedClaim}"`);

    /** @type {import('./AgentTypes.js').AgentContext} */
    const context = {
      originalClaim: rawClaim,
      refinedClaim: refinedClaim,
      evidence: [],
      toolsUsed: [],
      iteration: 0,
      reasoningLog: [],
      toolFailures: 0,
      timings: {
        factCheckMs: 0.00,
        newsSearchMs: 0.00,
        webSearchMs: 0.00,
        credibilityMs: 0.00,
        llmAnalysisMs: 0.00,
      }
    };

    while (context.iteration < MAX_ITERATIONS) {
      context.iteration++;
      console.log(`[AGENT] Starting iteration ${context.iteration}/${MAX_ITERATIONS}...`);

      // 1. Build the planning prompt injecting current state
      const prompt = this._buildPlanningPrompt(context);

      // 2. Ask LLM what to do next
      let responseText;
      const llmStart = startTimer();
      try {
        responseText = await this.llmService.generateText(prompt);
      } catch (error) {
        console.error(`[AGENT] LLM generation failed: ${error.message}`);
        context.reasoningLog.push(`LLM call failed: ${error.message}`);
        break; // Fail gracefully or move to fallback
      } finally {
        context.timings.llmAnalysisMs += stopTimer(llmStart);
      }

      // 3. Parse and normalize LLM response
      const decision = this._parseAgentResponse(responseText);
      if (!decision) {
        console.warn(`[AGENT] Failed to parse LLM response in iteration ${context.iteration}. Text was: ${responseText.substring(0, 150)}...`);
        context.reasoningLog.push(`Failed to parse LLM response.`);
        continue;
      }

      console.log(`[AGENT] LLM Thought: "${decision.reasoning || 'No thought specified'}"`);
      context.reasoningLog.push(decision.reasoning || `Decided action: ${decision.action}`);

      // 4. Handle AGENT_ACTIONS.FINAL_ANSWER
      if (decision.action === AGENT_ACTIONS.FINAL_ANSWER) {
        console.log(`[AGENT] Final Answer reached at iteration ${context.iteration}!`);
        return this._constructFinalResult(decision, context);
      }

      // 5. Handle AGENT_ACTIONS.USE_TOOL
      if (decision.action === AGENT_ACTIONS.USE_TOOL) {
        await this._handleToolExecution(decision, context);
      } else {
        console.warn(`[AGENT] Unknown action requested: "${decision.action}". Defaulting to final answer generation.`);
        break;
      }
    }

    // If we exited the loop without a FINAL_ANSWER, synthesize a verdict from collected evidence
    console.log(`[AGENT] Reached loop limit or early exit condition. Synthesizing final verdict from evidence.`);
    return this._synthesizeFinalResultFromEvidence(context);
  }

  /**
   * Builds the prompt instructing the agent on what to do next.
   * @param {import('./AgentTypes.js').AgentContext} context
   * @returns {string}
   * @private
   */
  _buildPlanningPrompt(context) {
    const toolDescriptions = this.toolRegistry.getToolDescriptions();
    const evidenceSerialized = context.evidence.length > 0 
      ? JSON.stringify(context.evidence, null, 2) 
      : 'No evidence collected yet.';

    return `You are NewsVerificationAgent.
Your goal is to verify the following claim using evidence:
"${context.refinedClaim}"

Available tools:
${toolDescriptions}

Rules:
1. Always analyze the claim and decide what evidence is needed.
2. Before answering, search for existing fact-check reports using FactCheckTool.
3. If fact-check reviews refer to external URLs or sources, use SourceCredibilityTool on those domains to evaluate their trustworthiness.
4. Evaluate evidence objectively. Never fabricate evidence.
5. Only use collected evidence. If you do not have enough evidence to verify a claim, output a verdict of "Insufficient Evidence".
6. Maximum 5 total iterations. Current iteration is: ${context.iteration} of ${MAX_ITERATIONS}.
7. Do not repeat the same tool call with the same input if it did not return new results.

Return your response strictly as a JSON object matching the schema below.
DO NOT include any Markdown formatting (like \`\`\`json) or any conversational text before or after the JSON.

SCHEMA FOR INTERMEDIATE TOOL USE:
{
  "action": "USE_TOOL",
  "reasoning": "<1 sentence explanation of what you are checking and why>",
  "tool": "<tool_name_from_above>",
  "toolInput": "<query, keyword, URL, or domain to feed into the tool>"
}

SCHEMA FOR FINAL ANSWER:
{
  "action": "FINAL_ANSWER",
  "reasoning": "<1 sentence explanation of why you are finished>",
  "verdict": "True" | "Likely True" | "Mixed" | "Likely False" | "False" | "Insufficient Evidence",
  "confidence": <integer percentage 0 to 100>,
  "summary": "<1-2 sentence overall summary of your verification verdict>",
  "verdictReasoning": [
    "<bullet point 1 explaining verdict based on evidence>",
    "<bullet point 2 explaining verdict based on evidence>"
  ]
}

Previously collected evidence so far:
---
${evidenceSerialized}
---

Your response:`;
  }

  /**
   * Parses the raw LLM response text into a structured agent decision
   * @param {string} rawText 
   * @returns {import('./AgentTypes.js').AgentAction|null}
   * @private
   */
  _parseAgentResponse(rawText) {
    const parsed = safeParseJSON(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    // Normalize actions
    let action = String(parsed.action || '').toUpperCase();
    if (action !== AGENT_ACTIONS.USE_TOOL && action !== AGENT_ACTIONS.FINAL_ANSWER) {
      action = AGENT_ACTIONS.FINAL_ANSWER; // Default fallback
    }

    return {
      action,
      tool: parsed.tool || null,
      toolInput: parsed.toolInput || null,
      reasoning: parsed.reasoning || '',
      verdict: parsed.verdict || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      summary: parsed.summary || null,
      verdictReasoning: Array.isArray(parsed.verdictReasoning) ? parsed.verdictReasoning : null,
    };
  }

  /**
   * Executes a tool action and records the result in the context
   * @param {import('./AgentTypes.js').AgentAction} action 
   * @param {import('./AgentTypes.js').AgentContext} context 
   * @private
   */
  async _handleToolExecution(action, context) {
    const toolName = action.tool;
    const toolInput = action.toolInput;

    if (!toolName || !this.toolRegistry.has(toolName)) {
      console.warn(`[AGENT] Requested tool "${toolName}" is not registered. Skipping.`);
      context.evidence.push({
        toolName: toolName || 'Unknown',
        input: toolInput || '',
        result: { error: `Tool "${toolName}" is not registered or unavailable.` },
        timestamp: new Date().toISOString(),
      });
      context.toolFailures++;
      return;
    }

    if (!toolInput) {
      console.warn(`[AGENT] Tool "${toolName}" was called without input.`);
      context.evidence.push({
        toolName,
        input: '',
        result: { error: 'Empty toolInput provided by agent.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check for potential infinite loops (same tool call, same input)
    const isDuplicate = context.evidence.some(
      ev => ev.toolName === toolName && ev.input.trim().toLowerCase() === toolInput.trim().toLowerCase()
    );

    if (isDuplicate) {
      console.warn(`[AGENT] Tool "${toolName}" called with duplicate input: "${toolInput}". Forcing planning deviation.`);
      context.evidence.push({
        toolName,
        input: toolInput,
        result: { warning: 'This exact tool input was already run. Try a different search term or source URL.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const tool = this.toolRegistry.get(toolName);
    console.log(`[AGENT] Executing tool ${toolName} with input: "${toolInput.substring(0, 100)}..."`);

    const toolStart = startTimer();
    try {
      const resultData = await tool.execute(toolInput);
      context.evidence.push({
        toolName,
        input: toolInput,
        result: resultData,
        timestamp: new Date().toISOString(),
      });
      context.toolsUsed.push(toolName);
      console.log(`[AGENT] Tool ${toolName} finished execution successfully.`);
    } catch (error) {
      console.error(`[AGENT] Tool ${toolName} failed during execution: ${error.message}`);
      context.evidence.push({
        toolName,
        input: toolInput,
        result: { error: `Execution error: ${error.message}` },
        timestamp: new Date().toISOString(),
      });
      context.toolFailures++;
    } finally {
      const duration = stopTimer(toolStart);
      this._accumulateToolTiming(toolName, duration, context.timings);
    }
  }

  /**
   * Constructs the final verification result when the agent declares FINAL_ANSWER
   * @param {import('./AgentTypes.js').AgentAction} decision 
   * @param {import('./AgentTypes.js').AgentContext} context 
   * @returns {import('./AgentTypes.js').VerificationResult}
   * @private
   */
  _constructFinalResult(decision, context) {
    const verdict = decision.verdict || AGENT_VERDICTS.INSUFFICIENT_EVIDENCE;
    const confidence = typeof decision.confidence === 'number' ? decision.confidence : 50;
    const summary = decision.summary || `Verification completed with verdict ${verdict}.`;
    const reasoning = decision.verdictReasoning || context.reasoningLog;

    // Collect all unique sources referenced across evidence
    const sources = this._extractSourcesFromEvidence(context.evidence);

    return {
      verdict,
      confidence,
      summary,
      reasoning,
      evidence: context.evidence,
      sources,
      timings: this._formatTimings(context.timings),
    };
  }

  /**
   * Fallback method to synthesize a verdict if the agent runs out of iterations
   * @param {import('./AgentTypes.js').AgentContext} context 
   * @returns {import('./AgentTypes.js').VerificationResult}
   * @private
   */
  _synthesizeFinalResultFromEvidence(context) {
    // Look for fact-check results in evidence to determine the best verdict
    let verdict = AGENT_VERDICTS.INSUFFICIENT_EVIDENCE;
    let confidence = 0;
    const reasoning = ['The verification loop reached the maximum execution threshold.'];

    const factCheckEvidence = context.evidence.find(ev => ev.toolName === 'FactCheckTool' && ev.result?.credibility);

    if (factCheckEvidence && factCheckEvidence.result.credibility.verdict !== 'unverified') {
      const dbVerdict = factCheckEvidence.result.credibility.verdict;
      confidence = factCheckEvidence.result.credibility.confidence || 50;
      
      // Map existing DB verdicts ('true', 'false', 'mixture', 'unverified') to agent verdicts
      if (dbVerdict === 'true') {
        verdict = AGENT_VERDICTS.TRUE;
        reasoning.push('Matched against verified facts confirming the claim is true.');
      } else if (dbVerdict === 'false') {
        verdict = AGENT_VERDICTS.FALSE;
        reasoning.push('Matched against verified facts confirming the claim is false.');
      } else if (dbVerdict === 'mixture') {
        verdict = AGENT_VERDICTS.MIXED;
        reasoning.push('Matched against reviews showing a mixture of true and false statements.');
      }
    } else {
      reasoning.push('No conclusive fact-check database match could be found during execution.');
    }

    const sources = this._extractSourcesFromEvidence(context.evidence);

    return {
      verdict,
      confidence,
      summary: `Verification completed with a synthesized verdict of ${verdict} due to execution threshold.`,
      reasoning,
      evidence: context.evidence,
      sources,
      timings: this._formatTimings(context.timings),
    };
  }

  /**
   * Extracts clean sources from gathered evidence
   * @param {import('./AgentTypes.js').Evidence[]} evidenceList 
   * @returns {import('./AgentTypes.js').Source[]}
   * @private
   */
  _extractSourcesFromEvidence(evidenceList) {
    const sourcesMap = new Map();

    evidenceList.forEach(ev => {
      // 1. Extract from FactCheckTool credibility sources
      if (ev.toolName === 'FactCheckTool' && ev.result?.credibility?.sources) {
        ev.result.credibility.sources.forEach(src => {
          const key = `${src.publisher}-${src.url}`;
          sourcesMap.set(key, {
            name: src.publisher,
            url: src.url,
            verdict: src.verdict,
          });
        });
      }

      // 2. Extract from SourceCredibilityTool runs
      if (ev.toolName === 'SourceCredibilityTool' && ev.result?.domain) {
        const key = `Credibility-${ev.result.domain}`;
        sourcesMap.set(key, {
          name: `Source Evaluation (${ev.result.domain})`,
          url: ev.input,
          verdict: `Credibility Score: ${ev.result.score}/100`,
        });
      }
    });

    return Array.from(sourcesMap.values());
  }

  /**
   * Accumulates the duration of a tool execution into the correct context timings key.
   * @param {string} toolName 
   * @param {number} duration 
   * @param {Object} timings 
   * @private
   */
  _accumulateToolTiming(toolName, duration, timings) {
    if (toolName === 'FactCheckTool') {
      timings.factCheckMs += duration;
    } else if (toolName === 'NewsSearchTool') {
      timings.newsSearchMs += duration;
    } else if (toolName === 'WebSearchTool') {
      timings.webSearchMs += duration;
    } else if (toolName === 'SourceCredibilityTool') {
      timings.credibilityMs += duration;
    }
  }

  /**
   * Formats timings object values to have 2 decimal precision.
   * @param {Object} timings 
   * @returns {Object}
   * @private
   */
  _formatTimings(timings) {
    return {
      factCheckMs: Number(timings.factCheckMs.toFixed(2)),
      newsSearchMs: Number(timings.newsSearchMs.toFixed(2)),
      webSearchMs: Number(timings.webSearchMs.toFixed(2)),
      credibilityMs: Number(timings.credibilityMs.toFixed(2)),
      llmAnalysisMs: Number(timings.llmAnalysisMs.toFixed(2)),
    };
  }
}

export default NewsVerificationAgent;
