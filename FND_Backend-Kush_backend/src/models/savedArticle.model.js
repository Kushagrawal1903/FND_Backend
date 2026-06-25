import mongoose from 'mongoose';

const savedArticleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required to save an article'],
    },
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Article URL is required'],
      trim: true,
      match: [/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i, 'Please enter a valid URL'],
    },
    verdict: {
      type: String,
      required: [true, 'Article verdict is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    modelUsed: {
      type: String,
      default: '',
    },
    sourcesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
savedArticleSchema.index({ userId: 1 });
savedArticleSchema.index({ url: 1 });

const SavedArticle = mongoose.model('SavedArticle', savedArticleSchema);

export default SavedArticle;
