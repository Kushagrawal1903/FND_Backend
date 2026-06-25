import mongoose from 'mongoose';
import { AGENT_NAMES } from '../../config/constants.js';

/**
 * AgentAudit Model
 * Records every individual agent invocation for observability, debugging, and reasoning trace.
 */
const agentAuditSchema = new mongoose.Schema(
  {
    /** Reference to the parent FactCheck document this execution belongs to */
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FactCheck',
      required: true,
    },

    /** Which agent ran (e.g. CLAIM_AGENT, BIAS_AGENT) */
    agentName: {
      type: String,
      required: true,
      enum: Object.values(AGENT_NAMES),
    },

    /** The input payload sent to the agent */
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** The output payload returned by the agent */
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** Detailed reasoning or chain of thought for the agent's decision */
    reasoning: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** List of URLs visited or consulted by the agent */
    urlsVisited: {
      type: [String],
      default: [],
    },

    /** Evidence snippets or scores used by the agent */
    evidenceUsed: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** Execution outcome */
    status: {
      type: String,
      enum: ['success', 'failed', 'skipped'],
      default: 'success',
    },

    /** Wall-clock execution time in milliseconds */
    executionTimeMs: {
      type: Number,
      default: 0,
    },

    /** Agent self-reported confidence (0-100) */
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /** Error message if the agent failed */
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
agentAuditSchema.index({ articleId: 1 });
agentAuditSchema.index({ agentName: 1 });
agentAuditSchema.index({ createdAt: -1 });

const AgentAudit = mongoose.model('AgentAudit', agentAuditSchema);

export default AgentAudit;
