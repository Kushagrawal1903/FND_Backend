import mongoose from 'mongoose';
import { AGENT_NAMES } from '../../config/constants.js';

/**
 * AgentExecution Model
 * Records every individual agent invocation for observability and debugging.
 * Each analysis run produces one document per agent that executed.
 */
const agentExecutionSchema = new mongoose.Schema(
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

    /** The input payload sent to the agent (stored as-is for replay) */
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /** The output payload returned by the agent */
    output: {
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
agentExecutionSchema.index({ articleId: 1 });
agentExecutionSchema.index({ agentName: 1 });
agentExecutionSchema.index({ createdAt: -1 });

const AgentExecution = mongoose.model('AgentExecution', agentExecutionSchema);

export default AgentExecution;
