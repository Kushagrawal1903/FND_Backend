import User from '../models/user.model.js';
import FactCheck from '../models/factCheck.model.js';
import Report from '../models/report.model.js';
import SavedArticle from '../models/savedArticle.model.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

/**
 * Service to handle all Administrator CRUD operations
 */
class AdminService {
  // ==========================================
  // USER CRUD
  // ==========================================

  async createUser(data) {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new BadRequestError('Email is already registered');
    }
    const user = await User.create(data);
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  async getAllUsers() {
    return await User.find().select('-password');
  }

  async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateUser(id, data) {
    // If updating email, check for uniqueness
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
      if (existing) {
        throw new BadRequestError('Email is already taken by another user');
      }
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Set updated values
    Object.keys(data).forEach((key) => {
      user[key] = data[key];
    });

    await user.save(); // save runs password pre-save hook if modified

    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    // Clean up related data (optional cascades)
    await FactCheck.deleteMany({ userId: id });
    await Report.deleteMany({ createdBy: id });
    await SavedArticle.deleteMany({ userId: id });
    return user;
  }

  // ==========================================
  // FACTCHECK CRUD
  // ==========================================

  async createFactCheck(data) {
    // Verify user exists if userId is provided
    if (data.userId) {
      const user = await User.findById(data.userId);
      if (!user) {
        throw new NotFoundError('Associated user not found');
      }
    }
    return await FactCheck.create(data);
  }

  async getAllFactChecks() {
    return await FactCheck.find().populate('userId', 'name email role').sort({ createdAt: -1 });
  }

  async getFactCheckById(id) {
    const factCheck = await FactCheck.findById(id).populate('userId', 'name email role');
    if (!factCheck) {
      throw new NotFoundError('Fact check record not found');
    }
    return factCheck;
  }

  async updateFactCheck(id, data) {
    if (data.userId) {
      const user = await User.findById(data.userId);
      if (!user) {
        throw new NotFoundError('Associated user not found');
      }
    }
    const factCheck = await FactCheck.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!factCheck) {
      throw new NotFoundError('Fact check record not found');
    }
    return factCheck;
  }

  async deleteFactCheck(id) {
    const factCheck = await FactCheck.findByIdAndDelete(id);
    if (!factCheck) {
      throw new NotFoundError('Fact check record not found');
    }
    return factCheck;
  }

  // ==========================================
  // REPORT CRUD
  // ==========================================

  async createReport(data) {
    const user = await User.findById(data.createdBy);
    if (!user) {
      throw new NotFoundError('Created by user not found');
    }
    return await Report.create(data);
  }

  async getAllReports() {
    return await Report.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
  }

  async getReportById(id) {
    const report = await Report.findById(id).populate('createdBy', 'name email');
    if (!report) {
      throw new NotFoundError('Report record not found');
    }
    return report;
  }

  async updateReport(id, data) {
    if (data.createdBy) {
      const user = await User.findById(data.createdBy);
      if (!user) {
        throw new NotFoundError('Created by user not found');
      }
    }
    const report = await Report.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!report) {
      throw new NotFoundError('Report record not found');
    }
    return report;
  }

  async deleteReport(id) {
    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      throw new NotFoundError('Report record not found');
    }
    return report;
  }

  // ==========================================
  // SAVED ARTICLE CRUD
  // ==========================================

  async createSavedArticle(data) {
    const user = await User.findById(data.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return await SavedArticle.create(data);
  }

  async getAllSavedArticles() {
    return await SavedArticle.find().populate('userId', 'name email').sort({ createdAt: -1 });
  }

  async getSavedArticleById(id) {
    const article = await SavedArticle.findById(id).populate('userId', 'name email');
    if (!article) {
      throw new NotFoundError('Saved article not found');
    }
    return article;
  }

  async updateSavedArticle(id, data) {
    if (data.userId) {
      const user = await User.findById(data.userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
    }
    const article = await SavedArticle.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!article) {
      throw new NotFoundError('Saved article not found');
    }
    return article;
  }

  async deleteSavedArticle(id) {
    const article = await SavedArticle.findByIdAndDelete(id);
    if (!article) {
      throw new NotFoundError('Saved article not found');
    }
    return article;
  }
}

export default new AdminService();
