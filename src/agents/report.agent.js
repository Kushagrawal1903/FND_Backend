class ReportAgent {
  constructor() {
    this.name = 'report';
  }

  async execute(state) {
    const reasoning = state.reasoning || {};
    const references = this._extractReferences(state);

    return {
      verdict: reasoning.verdict || 'Insufficient Evidence',
      confidence: Number(reasoning.confidence || 0),
      supportingEvidence: reasoning.supportingEvidence || [],
      conflictingEvidence: reasoning.conflictingEvidence || [],
      reasoning: reasoning.reasoning || [],
      explanation: reasoning.explanation || reasoning.summary || 'Verification completed.',
      summary: reasoning.summary || reasoning.explanation || 'Verification completed.',
      references,
      evidence: state.evidence,
      credibility: state.credibility,
      executionMetadata: state.getExecutionMetadata(),
    };
  }

  _extractReferences(state) {
    const references = new Map();

    const addReference = (publisher, url, verdict) => {
      if (!url) return;
      references.set(url, {
        publisher: publisher || this._hostname(url),
        url,
        verdict: verdict || 'Referenced',
      });
    };

    state.evidence.forEach(item => {
      const result = item.result || {};

      (result.credibility?.sources || []).forEach(source => {
        addReference(source.publisher, source.url, source.verdict);
      });

      (result.results || []).forEach(source => {
        addReference(source.publisher || source.title, source.url, source.verdict || 'Search result');
      });

      (result.claims || []).forEach(claim => {
        (claim.reviews || []).forEach(review => {
          addReference(review.publisher, review.url, review.rating);
        });
      });
    });

    return Array.from(references.values());
  }

  _hostname(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'Reference';
    }
  }
}

export default ReportAgent;
