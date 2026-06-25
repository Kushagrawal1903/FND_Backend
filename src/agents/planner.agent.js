class PlannerAgent {
  constructor({ defaultProviders = ['googleFactCheck', 'newsSearch', 'webSearch'] } = {}) {
    this.name = 'planner';
    this.defaultProviders = defaultProviders;
  }

  async execute(state) {
    const input = String(state.originalInput || '').trim();
    const inputType = this._detectInputType(input);
    const wordCount = input.split(/\s+/).filter(Boolean).length;

    const plan = {
      inputType,
      contentType: this._getContentType(inputType, wordCount),
      evidenceProviders: this._selectEvidenceProviders(inputType, wordCount),
      credibilityRequired: true,
      reasoningRequired: true,
      maxEvidenceRounds: state.metadata.maxEvidenceRounds,
      confidenceThreshold: state.metadata.confidenceThreshold,
      notes: [],
    };

    if (inputType === 'image') {
      plan.notes.push('Image-specific tools are not configured yet; verification will use available textual context only.');
    }

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

  _selectEvidenceProviders(inputType, wordCount) {
    if (inputType === 'image') {
      return ['googleFactCheck', 'webSearch'];
    }

    if (inputType === 'url' || wordCount >= 120) {
      return this.defaultProviders;
    }

    return ['googleFactCheck', 'webSearch'];
  }
}

export default PlannerAgent;
