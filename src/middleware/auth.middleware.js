import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/user.model.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Middleware to protect routes and ensure user is authenticated
 */
const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Check for authorization header and confirm it starts with Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Not authorized to access this route, token missing'));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from token payload, excluding password
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new UnauthorizedError('The user belonging to this token no longer exists'));
      }

      // Grant access and store user info in request object
      req.user = user;
      next();
    } catch (err) {
      return next(new UnauthorizedError('Not authorized, invalid token'));
    }
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
