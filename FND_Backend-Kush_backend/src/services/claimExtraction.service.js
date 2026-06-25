/**
 * Service to extract core claims and keywords from user-provided text
 */
class ClaimExtractionService {
  constructor() {
    // List of common English stop words to filter out when extracting keywords
    this.stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
      'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from',
      'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here',
      'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
      'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor',
      'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
      'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that',
      'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres', 'these', 'they', 'theyd',
      'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
      'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
      'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd',
      'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
    ]);
  }

  /**
   * Extracts the core claim from a block of text.
   * If the text is short, it returns it as is.
   * If it is a long text, it extracts the most descriptive sentence or key phrases.
   * @param {string} text - User input text
   * @returns {string} The extracted claim suitable for querying fact-checking databases
   */
  extractClaim(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const trimmed = text.trim();
    
    // If it's already short (e.g. less than 150 chars), it's likely a direct claim
    if (trimmed.length <= 150) {
      return trimmed;
    }

    // Split text into sentences
    const sentences = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    if (sentences.length === 0) {
      return trimmed.substring(0, 150);
    }

    // Score sentences based on presence of key entities, numbers, claim indicators
    let bestSentence = sentences[0];
    let highestScore = -1;

    // Words that often signal a claim or statement of fact
    const claimSignals = ['say', 'stated', 'confirmed', 'found', 'announced', 'discovered', 'proved', 'claimed', 'shows', 'according'];

    sentences.forEach(sentence => {
      let score = 0;
      const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];

      // Length penalty/reward (optimal claim sentence length is between 8 and 25 words)
      if (words.length >= 8 && words.length <= 25) {
        score += 5;
      }

      // Check for numbers (percentages, dates, etc.) which often exist in claims
      const hasNumber = /\d+/.test(sentence);
      if (hasNumber) score += 3;

      // Check for signal words
      words.forEach(word => {
        if (claimSignals.includes(word)) {
          score += 2;
        }
        // Reward longer, content-carrying words
        if (word.length > 5 && !this.stopWords.has(word)) {
          score += 1;
        }
      });

      if (score > highestScore) {
        highestScore = score;
        bestSentence = sentence;
      }
    });

    return bestSentence;
  }

  /**
   * Extracts key terms/keywords for broader searches or indexing
   * @param {string} text - The input text
   * @param {number} limit - Maximum number of keywords to return
   * @returns {Array<string>} List of keywords
   */
  extractKeywords(text, limit = 5) {
    if (!text) return [];

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word));

    // Count frequencies
    const freqMap = {};
    words.forEach(word => {
      freqMap[word] = (freqMap[word] || 0) + 1;
    });

    // Sort by frequency and length
    return Object.keys(freqMap)
      .sort((a, b) => {
        // Primary sort: frequency
        if (freqMap[b] !== freqMap[a]) {
          return freqMap[b] - freqMap[a];
        }
        // Secondary sort: length
        return b.length - a.length;
      })
      .slice(0, limit);
  }
}

export default new ClaimExtractionService();
