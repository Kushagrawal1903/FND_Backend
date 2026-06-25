class PlannerAgent {
  constructor({ defaultProviders = ['googleFactCheck', 'webSearch'] } = {}) {
    this.name = 'planner';
    this.defaultProviders = defaultProviders;
  }

  async execute(state) {
    const input = String(state.originalInput || '').trim();
    const inputType = this._detectInputType(input);
    const wordCount = input.split(/\s+/).filter(Boolean).length;
    const claimClassification = this._classifyClaim(input);
    const evidenceProviders = this._selectEvidenceProviders(inputType, wordCount, claimClassification);

    const plan = {
      inputType,
      contentType: this._getContentType(inputType, wordCount),
      claimClassification,
      tools: evidenceProviders,
      evidenceProviders,
      executionPlan: evidenceProviders.map((provider, index) => ({
        order: index + 1,
        provider,
        reason: this._getProviderReason(provider, claimClassification),
      })),
      credibilityRequired: true,
      reasoningRequired: true,
      maxEvidenceRounds: state.metadata.maxEvidenceRounds,
      confidenceThreshold: state.metadata.confidenceThreshold,
      notes: [],
    };

    if (inputType === 'image') {
      plan.notes.push('Image-specific tools are not configured yet; verification will use available textual context only.');
    }

    console.log('[PLANNER AGENT] Execution Plan:', JSON.stringify(plan.executionPlan));
    console.log('[PLANNER AGENT] Planner Selected Tools:', evidenceProviders.join(', '));

    return plan;
  }

  _detectInputType(input) {
    if (/^data:image\//i.test(input) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(input)) {
      return 'image';
    }

    if (/^https?:\/\//i.test(input)) {
      return 'url';
    }

    return 'text';
  }

  _getContentType(inputType, wordCount) {
    if (inputType === 'url') return 'url';
    if (inputType === 'image') return 'image';
    if (wordCount >= 120) return 'long_article';
    return 'short_claim';
  }

  _classifyClaim(input) {
    const normalized = input.toLowerCase();

    const breakingSignals = [
      'breaking', 'just in', 'developing', 'live update', 'today', 'this morning',
      'this evening', 'minutes ago', 'hours ago', 'latest', 'urgent',
    ];

    const politicalSignals = [
      'election', 'vote', 'voting', 'president', 'prime minister', 'minister',
      'parliament', 'senate', 'congress', 'government', 'policy', 'campaign',
      'candidate', 'party', 'supreme court',
    ];

    const currentAffairsSignals = [
      'current', 'recent', 'announced', 'new law', 'new policy', 'inflation',
      'market', 'war', 'conflict', 'protest', 'budget', 'diplomatic', 'summit',
    ];

    const historicalSignals = [
      'history', 'historical', 'ancient', 'world war', 'in 19', 'in 20',
      'founded', 'invented', 'discovered', 'was born', 'died in',
    ];

    if (breakingSignals.some(signal => normalized.includes(signal))) {
      return 'breaking_news';
    }

    if (politicalSignals.some(signal => normalized.includes(signal))) {
      return 'political_news';
    }

    if (currentAffairsSignals.some(signal => normalized.includes(signal))) {
      return 'current_affairs';
    }

    if (historicalSignals.some(signal => normalized.includes(signal))) {
      return 'historical_fact';
    }

    return 'general_claim';
  }

  _selectEvidenceProviders(inputType, wordCount, claimClassification) {
    if (inputType === 'image') {
      return ['googleFactCheck', 'webSearch'];
    }

    if (claimClassification === 'breaking_news') {
      return ['googleFactCheck', 'webSearch', 'gnews'];
    }

    if (claimClassification === 'current_affairs' || claimClassification === 'political_news') {
      return ['googleFactCheck', 'gnews', 'webSearch'];
    }

    if (claimClassification === 'historical_fact') {
      return ['googleFactCheck', 'webSearch'];
    }

    if (inputType === 'url' || wordCount >= 120) {
      return [...this.defaultProviders, 'gnews'];
    }

    return this.defaultProviders;
  }

  _getProviderReason(provider, claimClassification) {
    const reasons = {
      googleFactCheck: 'Find existing fact-check reviews and verdicts.',
      webSearch: 'Collect broad corroborating or conflicting public web evidence.',
      gnews: 'Collect recent news coverage for time-sensitive or current claims.',
      newsSearch: 'Collect configured news-provider results.',
    };

    if (provider === 'gnews' && claimClassification === 'breaking_news') {
      return 'Breaking claims require recent news articles.';
    }

    if (provider === 'gnews' && claimClassification === 'political_news') {
      return 'Political claims require recent reporting from news sources.';
    }

    if (provider === 'gnews' && claimClassification === 'current_affairs') {
      return 'Current-affairs claims require fresh news context.';
    }

    return reasons[provider] || 'Collect evidence for verification.';
  }
}

export default PlannerAgent;
