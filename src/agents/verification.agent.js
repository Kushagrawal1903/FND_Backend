class VerificationAgent {
  constructor({ confidenceThreshold = 75 } = {}) {
    this.name = 'verification';
    this.confidenceThreshold = confidenceThreshold;
  }

  async execute(state) {
    const confidence = Number(state.reasoning?.confidence || 0);
    const hasEvidence = state.evidence.some(item => !item.result?.error);
    const maxRoundsReached = state.metadata.evidenceRound >= state.metadata.maxEvidenceRounds;
    const availableExecutionPlan = Array.isArray(state.plan?.executionPlan)
      ? state.plan.executionPlan
      : (state.plan?.evidenceProviders || []).map((provider, index) => ({ order: index + 1, provider }));
    const availableProviders = availableExecutionPlan.map(step => step.provider);
    const unusedProviders = availableProviders.filter(provider => !state.visitedTools.includes(provider));
    const unusedExecutionPlan = availableExecutionPlan.filter(step => unusedProviders.includes(step.provider));
    const sufficient = hasEvidence && confidence >= state.metadata.confidenceThreshold;

    if (sufficient || maxRoundsReached || unusedProviders.length === 0) {
      return {
        approved: true,
        confidence,
        sufficient,
        requestAdditionalEvidence: false,
        requestedProviders: [],
        requestedExecutionPlan: [],
        reason: sufficient
          ? 'Confidence threshold reached.'
          : 'No additional configured evidence providers remain or max evidence rounds were reached.',
      };
    }

    return {
      approved: false,
      confidence,
      sufficient: false,
      requestAdditionalEvidence: true,
      requestedProviders: unusedProviders,
      requestedExecutionPlan: unusedExecutionPlan,
      reason: 'Confidence is below threshold; additional evidence is required.',
    };
  }
}

export default VerificationAgent;
