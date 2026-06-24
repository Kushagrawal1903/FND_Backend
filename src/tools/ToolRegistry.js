/**
 * Tool Registry
 * 
 * Manages registration and discovery of all tools available to the
 * NewsVerificationAgent. Provides formatted tool descriptions for
 * injection into the LLM planning prompt.
 * 
 * WHY THIS EXISTS:
 * The agent needs to know what tools are available and what each tool does.
 * Rather than hardcoding tool references inside the agent, this registry
 * provides a clean abstraction that allows tools to be added/removed
 * without modifying agent code.
 */

import FactCheckTool from './FactCheckTool.js';
import NewsSearchTool from './NewsSearchTool.js';
import WebSearchTool from './WebSearchTool.js';
import SourceCredibilityTool from './SourceCredibilityTool.js';

class ToolRegistry {
  constructor() {
    /** @type {Map<string, {name: string, description: string, execute: function}>} */
    this.tools = new Map();
  }

  /**
   * Register a tool instance
   * @param {{name: string, description: string, execute: function}} tool
   */
  register(tool) {
    if (!tool.name || !tool.description || typeof tool.execute !== 'function') {
      throw new Error(`Invalid tool registration: tool must have name, description, and execute()`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[TOOL REGISTRY] Registered tool: ${tool.name}`);
  }

  /**
   * Retrieve a tool by name
   * @param {string} name - Tool name
   * @returns {{name: string, description: string, execute: function}|undefined}
   */
  get(name) {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names
   * @returns {string[]}
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Generate a formatted description of all available tools for inclusion
   * in the LLM planning prompt. This tells the LLM what tools exist and
   * what each one does.
   * @returns {string}
   */
  getToolDescriptions() {
    const descriptions = [];
    for (const [name, tool] of this.tools) {
      descriptions.push(`- ${name}: ${tool.description}`);
    }
    return descriptions.join('\n');
  }

  /**
   * Factory method to create a registry pre-loaded with all default tools
   * @returns {ToolRegistry}
   */
  static createDefault() {
    const registry = new ToolRegistry();
    registry.register(new FactCheckTool());
    registry.register(new NewsSearchTool());
    registry.register(new WebSearchTool());
    registry.register(new SourceCredibilityTool());
    return registry;
  }
}

export default ToolRegistry;
