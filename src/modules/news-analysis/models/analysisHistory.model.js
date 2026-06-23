import mongoose from 'mongoose';

const analysisHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Null if not authenticated
    },
    articleText: {
      type: String,
      required: true,
    },
    verdict: {
      type: String,
      required: true,
      enum: ['REAL', 'FAKE', 'MIXTURE', 'UNVERIFIED'],
    },
    confidence: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    provider: {
      type: String,
      required: true,
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      description: 'The full JSON response from the LLM provider',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
analysisHistorySchema.index({ userId: 1 });
analysisHistorySchema.index({ createdAt: -1 });
analysisHistorySchema.index({ verdict: 1 });
analysisHistorySchema.index({ provider: 1 });

const AnalysisHistory = mongoose.model('AnalysisHistory', analysisHistorySchema);

export default AnalysisHistory;
