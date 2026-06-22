import authService from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Controller for Authentication Endpoints
 */
class AuthController {
  /**
   * Registers a new user
   */
  async register(req, res, next) {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      // Delegate to service
      const result = await authService.register(value);

      res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logs in an existing user
   */
  async login(req, res, next) {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        throw new BadRequestError(error.details[0].message);
      }

      // Delegate to service
      const result = await authService.login(value.email, value.password);

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logs out current user (stateless logout info confirmation)
   */
  async logout(req, res, next) {
    try {
      // JWT is stateless; client should delete token. 
      // We return success to confirm client action.
      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully. Please remove token from local storage.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets details of currently authenticated user
   */
  async getMe(req, res, next) {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
