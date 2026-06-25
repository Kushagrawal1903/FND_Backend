class ContentIntelligenceAgent {
  constructor({ claimExtractionService }) {
    this.name = 'content';
    this.claimExtractionService = claimExtractionService;
  }

  async execute(state) {
    const input = String(state.originalInput || '');
    const mainClaim = state.extractedClaim || this.claimExtractionService.extractClaim(input);
    const keywords = this.claimExtractionService.extractKeywords(input, 8);

    return {
      mainClaim,
      entities: this._extractEntities(input),
      keywords,
      language: this._detectLanguage(input),
      topic: this._inferTopic(input, keywords),
      context: {
        inputType: state.plan?.inputType || 'text',
        contentType: state.plan?.contentType || 'short_claim',
        wordCount: input.split(/\s+/).filter(Boolean).length,
        charCount: input.length,
      },
    };
  }

  _extractEntities(text) {
    const matches = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) || [];
    return [...new Set(matches)].slice(0, 12);
  }

  _detectLanguage(text) {
    return /^[\x00-\x7F]*$/.test(text) ? 'en' : 'unknown';
  }

  _inferTopic(text, keywords) {
    const normalized = text.toLowerCase();
    const topicSignals = [
      { topic: 'health', terms: ['health', 'vaccine', 'virus', 'covid', 'doctor', 'medicine', 'disease'] },
      { topic: 'politics', terms: ['election', 'minister', 'president', 'government', 'policy', 'vote'] },
      { topic: 'science', terms: ['nasa', 'research', 'study', 'scientist', 'space', 'climate'] },
      { topic: 'finance', terms: ['bank', 'market', 'stock', 'money', 'tax', 'economy'] },
      { topic: 'technology', terms: ['ai', 'software', 'app', 'data', 'internet', 'device'] },
    ];

    const match = topicSignals.find(signal => signal.terms.some(term => normalized.includes(term)));
    return match?.topic || keywords[0] || 'general';
  }
}

export default ContentIntelligenceAgent;
