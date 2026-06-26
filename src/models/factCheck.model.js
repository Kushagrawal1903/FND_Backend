import mongoose from 'mongoose';
import { VERDICTS } from '../config/constants.js';

const sourceSchema = new mongoose.Schema({
  publisher: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  verdict: {
    type: String,
    required: true,
  },
});

const factCheckSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null for anonymous checks
    },
    claim: {
      type: String,
      required: [true, 'Claim text is required'],
      trim: true,
    },
    verdict: {
      type: String,
      enum: Object.values(VERDICTS),
      required: [true, 'Verdict is required'],
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence score cannot be negative'],
      max: [100, 'Confidence score cannot exceed 100'],
      required: [true, 'Confidence score is required'],
    },
    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
    },
    sources: [sourceSchema],
    agentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    performance: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimization
factCheckSchema.index({ userId: 1 });
factCheckSchema.index({ createdAt: -1 });
factCheckSchema.index({ verdict: 1 });

const FactCheck = mongoose.model('FactCheck', factCheckSchema);

export default FactCheck;
