import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { config } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors.js';

/**
 * Service to handle authentication operations (Registration, Login, JWT Generation)
 */
class AuthService {
  /**
   * Register a new user in the system
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} The registered user and a JWT token
   */
  async register(userData) {
    const { name, email, password, role } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Create the user (password hashing is done in Mongoose pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // Generate JWT token
    const token = this.generateToken(user._id);

    // Remove password from returned user object
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Authenticates a user and returns a token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} The authenticated user and a JWT token
   */
  async login(email, password) {
    // Find user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user._id);

    // Format response
    const userResponse = user.toObject();
    delete userResponse.password;

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Helper to sign a JWT token
   * @param {string} userId - User ID to embed in payload
   * @returns {string} Signed JWT token
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }
}

export default new AuthService();
