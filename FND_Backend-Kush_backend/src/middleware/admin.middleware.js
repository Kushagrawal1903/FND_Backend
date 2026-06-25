import { ForbiddenError } from '../utils/errors.js';
import { ROLES } from '../config/constants.js';

/**
 * Middleware to restrict route access to administrators only
 */
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === ROLES.ADMIN) {
    next();
  } else {
    next(new ForbiddenError('Access denied: Administrator privileges required'));
  }
};

export default adminMiddleware;
