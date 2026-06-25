import mongoose from 'mongoose';
import { REPORT_STATUS } from '../config/constants.js';

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Report title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Report description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.PENDING,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporting user is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ createdBy: 1 });
reportSchema.index({ status: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
