import orchestratorAgent from '../orchestrator.agent.js';
import AgentAudit from '../models/AgentAudit.model.js';
import FactCheck from '../../models/factCheck.model.js';
import logger from '../../utils/logger.js';

/**
 * Fake News Analysis Workflow
 * Single entry point for the entire agentic pipeline.
 * Coordinates the orchestrator and persists results to MongoDB.
 *
 * Usage:
 *   import fakeNewsWorkflow from './agents/workflows/fakeNews.workflow.js';
 *   const result = await fakeNewsWorkflow.analyzeArticle({ articleText, url, userId });
 */
class FakeNewsWorkflow {
  /**
   * Analyze an article through the full agentic pipeline.
   */
  async analyzeArticle({ articleText, url = null, publisher = null, userId = null }) {
    console.log('[WORKFLOW] Entered FakeNewsWorkflow.analyzeArticle');
    logger.info(`[WORKFLOW] Starting agentic analysis for user=${userId || 'anonymous'}`);

    const result = await orchestratorAgent.execute({ articleText, url, publisher });

    const mappedVerdict = this._mapVerdict(result.verdict);
    const normalizedClaim = this._extractPrimaryClaim(result.claims, articleText);
    const timeline = this._buildTimeline(result.agentExecutionSummary);
    const evidenceSources = this._buildEvidenceSources(result);
    const executionReport = this._buildExecutionReport(result);

    const factCheck = await FactCheck.create({
      userId,
      claim: normalizedClaim,
      originalClaim: articleText,
      normalizedClaim,
      verdict: mappedVerdict,
      confidence: result.confidence,
      explanation: result.reasoning.join(' '),
      sources: this._extractSources(result),
      reasoning: result.reasoning || [],
      supportingSources: result.evidenceSummary?.supportingSources || [],
      contradictingSources: result.evidenceSummary?.contradictingSources || [],
      evidenceSources,
      timeline,
      executionReport,
    });

    await this._saveAgentAudits(factCheck._id, result.agentExecutionSummary);

    this._printExecutionReport(result);

    logger.info(`[WORKFLOW] Analysis complete. FactCheck ID: ${factCheck._id}, Verdict: ${mappedVerdict}`);

    return {
      articleId: factCheck._id,
      originalClaim: articleText,
      normalizedClaim,
      verdict: result.verdict,
      confidence: result.confidence,
      claims: result.claims,
      sourceAnalysis: result.sourceAnalysis,
      factCheckResults: result.factCheckResults,
      researchResults: result.researchResults,
      biasAnalysis: result.biasAnalysis,
      evidenceSummary: result.evidenceSummary,
      reasoning: result.reasoning,
      agentExecutionSummary: result.agentExecutionSummary,
      totalExecutionTimeMs: result.totalExecutionTimeMs,
      createdAt: factCheck.createdAt,
      // New evidence transparency fields
      timeline,
      evidenceSources,
      supportingEvidence: result.evidenceSummary?.supportingSources || [],
      contradictingEvidence: result.evidenceSummary?.contradictingSources || [],
      authorityWeightedScore: {
        support: result.evidenceSummary?.supportScore || 0,
        contradict: result.evidenceSummary?.contradictScore || 0,
      },
      executionReport,
    };
  }

  /**
   * Map agentic verdicts to the FactCheck model's enum values.
   */
  _mapVerdict(verdict) {
    const map = {
      'true': 'true',
      'false': 'false',
      'mixture': 'mixture',
      'likely_true': 'likely_true',
      'likely_false': 'likely_false',
      'insufficient_evidence': 'insufficient_evidence',
      'unverified': 'unverified',
    };
    return map[verdict] || 'unverified';
  }

  /**
   * Extract the primary claim text for the FactCheck record.
   */
  _extractPrimaryClaim(claims, articleText) {
    if (claims && claims.length > 0 && claims[0].text) {
      return claims[0].text;
    }
    return articleText.substring(0, 200);
  }

  /**
   * Extract source references for the FactCheck record.
   */
  _extractSources(result) {
    const sources = [];

    // From evidence supporting/contradicting sources
    const allEvidenceSources = [
      ...(result.evidenceSummary?.supportingSources || []),
      ...(result.evidenceSummary?.contradictingSources || []),
    ];

    allEvidenceSources.forEach(s => {
      if (s.url) {
        sources.push({
          publisher: s.source || s.title || 'Unknown',
          url: s.url,
          verdict: s.classification || result.verdict,
        });
      }
    });

    // From fact-check results
    if (result.factCheckResults?.results) {
      result.factCheckResults.results.forEach(fc => {
        if (fc.sources) {
          fc.sources.forEach(s => {
            sources.push({
              publisher: s.publisher || 'Fact Checker',
              url: s.url || '',
              verdict: s.verdict || fc.verdict,
            });
          });
        }
      });
    }

    if (sources.length === 0) {
      sources.push({
        publisher: 'Agentic AI Pipeline',
        url: 'https://truthlens.verify.info/ai-report',
        verdict: result.verdict,
      });
    }

    return sources;
  }

  /**
   * Build the agent execution timeline.
   */
  _buildTimeline(executionSummary) {
    if (!executionSummary) return [];
    return executionSummary.map(exec => ({
      agentName: exec.agentName,
      executionTimeMs: exec.executionTimeMs || 0,
      status: exec.status || 'success',
    }));
  }
  /**
   * Build evidence sources list.
   */
  _buildEvidenceSources(result) {
    const sources = [];
    const seen = new Set();

    const addSource = (s) => {
      if (s.url && !seen.has(s.url)) {
        seen.add(s.url);
        sources.push({
          url: s.url,
          title: s.title || s.source || '',
          source: s.source || '',
          snippet: s.snippet || s.evidenceSnippet || '',
          publicationDate: s.publishedAt || null,
          publishedAt: s.publishedAt || null,
          authorityScore: s.authorityScore || 40,
          sourceTier: s.sourceTier || 3,
          classification: s.classification || 'neutral',
          confidence: s.confidence || 0,
          explanation: s.explanation || '',
          origin: s.origin || 'unknown',
        });
      }
    };

    (result.evidenceSummary?.supportingSources || []).forEach(addSource);
    (result.evidenceSummary?.contradictingSources || []).forEach(addSource);

    return sources.sort((a, b) => {
      if (b.authorityScore !== a.authorityScore) {
        return b.authorityScore - a.authorityScore;
      }
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Persist agent execution records to MongoDB.
   */
  async _saveAgentAudits(articleId, executionSummary) {
    try {
      const docs = executionSummary.map(exec => ({
        articleId,
        agentName: exec.agentName,
        input: exec.input || null,
        output: exec.output || null,
        reasoning: exec.reasoning || null,
        urlsVisited: exec.urlsVisited || [],
        evidenceUsed: exec.evidenceUsed || null,
        status: exec.status,
        executionTimeMs: exec.executionTimeMs,
        confidence: exec.confidence,
        errorMessage: exec.errorMessage || null,
      }));

      await AgentAudit.insertMany(docs);
      logger.debug(`[WORKFLOW] Saved ${docs.length} agent audit records`);
    } catch (error) {
      logger.error(`[WORKFLOW] Failed to save agent audits: ${error.message}`);
    }
  }

  _buildExecutionReport(result) {
    const getSummary = (name) => result.agentExecutionSummary?.find(a => a.agentName === name) || {};

    const claimAgent = getSummary('CLAIM_AGENT');
    const sourceAgent = getSummary('SOURCE_AGENT');
    const factCheckAgent = getSummary('FACTCHECK_AGENT');
    const researchAgent = getSummary('RESEARCH_AGENT');
    const biasAgent = getSummary('BIAS_AGENT');
    const evidenceAgent = getSummary('EVIDENCE_AGENT');
    const verdictAgent = getSummary('VERDICT_AGENT');

    return `ClaimAgent ........ ${claimAgent.executionTimeMs || 0}ms
SourceAgent ....... ${sourceAgent.executionTimeMs || 0}ms
FactCheckAgent .... ${factCheckAgent.executionTimeMs || 0}ms
ResearchAgent ..... ${researchAgent.executionTimeMs || 0}ms
BiasAgent ......... ${biasAgent.executionTimeMs || 0}ms
EvidenceAgent ..... ${evidenceAgent.executionTimeMs || 0}ms
VerdictAgent ...... ${verdictAgent.executionTimeMs || 0}ms
Total Time ........ ${result.totalExecutionTimeMs || 0}ms`;
  }

  _printExecutionReport(result) {
    const report = this._buildExecutionReport(result);
    console.log(`\n=== AGENTIC EXECUTION REPORT ===\n${report}\n`);
  }
}

export default new FakeNewsWorkflow();
