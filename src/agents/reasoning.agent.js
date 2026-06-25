import { safeParseJSON } from '../utils/jsonParser.js';
import { startTimer, stopTimer } from '../utils/timer.js';

class ReasoningAgent {
  constructor({ llmService }) {
    this.name = 'reasoning';
    this.llmService = llmService;
  }

  async execute(state) {
    const fallback = this._reasonDeterministically(state);

    try {
      const timer = startTimer();
      const response = await this.llmService.generateText(this._buildPrompt(state, fallback));
      const durationMs = stopTimer(timer);
      state.addLlmTiming(durationMs);

      const parsed = safeParseJSON(response);
      return this._normalize(parsed, fallback);
    } catch (error) {
      state.addError(error, { agent: this.name, phase: 'llm_reasoning' });
      return fallback;
    }
  }

  _buildPrompt(state, fallback) {
    const preparedEvidence = state.preparedEvidence?.items || [];
    const sourceCredibility = state.preparedEvidence?.sourceCredibility || [];
    const preparationStats = state.preparedEvidence?.stats || {};

    return `You are the Reasoning Agent in a fake-news verification workflow.
Analyze only the provided evidence. Do not invent facts.

Claim:
${state.content?.mainClaim || state.extractedClaim}

Compact ranked evidence:
${JSON.stringify(preparedEvidence, null, 2)}

Compact source credibility:
${JSON.stringify(sourceCredibility, null, 2)}

Evidence preparation stats:
${JSON.stringify(preparationStats, null, 2)}

Return strict JSON:
{
  "verdict": "True" | "Likely True" | "Mixed" | "Likely False" | "False" | "Insufficient Evidence",
  "confidence": 0,
  "supportingEvidence": [],
  "conflictingEvidence": [],
  "reasoning": [],
  "summary": "",
  "explanation": ""
}

If evidence is thin, prefer this conservative baseline:
${JSON.stringify(this._compactFallback(fallback), null, 2)}`;
  }

  _reasonDeterministically(state) {
    const factCheckEvidence = state.evidence.find(item => item.toolName === 'googleFactCheck' && item.result?.credibility);
    const credibility = factCheckEvidence?.result?.credibility;
    const sources = credibility?.sources || [];
    const verdict = this._mapDbVerdictToAgent(credibility?.verdict);
    const confidence = Number(credibility?.confidence || 0);

    if (sources.length > 0 && verdict !== 'Insufficient Evidence') {
      return {
        verdict,
        confidence,
        supportingEvidence: sources,
        conflictingEvidence: [],
        reasoning: [
          `Google Fact Check returned ${sources.length} reviewed source(s).`,
          `The normalized consensus verdict is ${credibility.verdict}.`,
        ],
        summary: `Existing fact-check evidence indicates: ${verdict}.`,
        explanation: `The claim was compared against available fact-check reviews and scored using the existing credibility service.`,
      };
    }

    return {
      verdict: 'Insufficient Evidence',
      confidence: Math.min(30, confidence),
      supportingEvidence: [],
      conflictingEvidence: [],
      reasoning: ['No conclusive fact-check evidence was found from configured tools.'],
      summary: 'The available evidence is not strong enough to verify the claim.',
      explanation: 'The workflow gathered available evidence but did not find enough reliable corroboration or contradiction.',
    };
  }

  _normalize(parsed, fallback) {
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    return {
      verdict: parsed.verdict || fallback.verdict,
      confidence: this._clampConfidence(parsed.confidence ?? fallback.confidence),
      supportingEvidence: Array.isArray(parsed.supportingEvidence) ? parsed.supportingEvidence : fallback.supportingEvidence,
      conflictingEvidence: Array.isArray(parsed.conflictingEvidence) ? parsed.conflictingEvidence : fallback.conflictingEvidence,
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : fallback.reasoning,
      summary: parsed.summary || fallback.summary,
      explanation: parsed.explanation || fallback.explanation,
    };
  }

  _mapDbVerdictToAgent(verdict) {
    if (verdict === 'true') return 'True';
    if (verdict === 'false') return 'False';
    if (verdict === 'mixture') return 'Mixed';
    return 'Insufficient Evidence';
  }

  _clampConfidence(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  _compactFallback(fallback) {
    return {
      verdict: fallback.verdict,
      confidence: fallback.confidence,
      summary: fallback.summary,
      reasoning: Array.isArray(fallback.reasoning) ? fallback.reasoning.slice(0, 3) : [],
    };
  }
}

export default ReasoningAgent;
