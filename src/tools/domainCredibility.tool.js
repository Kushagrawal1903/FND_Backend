import SourceCredibilityTool from './SourceCredibilityTool.js';

class DomainCredibilityTool extends SourceCredibilityTool {
  constructor(config = {}) {
    super(config);
    this.name = 'domainCredibility';
  }
}

export default DomainCredibilityTool;
