import { body, validationResult } from 'express-validator';
import { responseFormatter } from '../../../utils/responseFormatter.js';

/**
 * Express Validator rules for the news analysis endpoint
 */
export const validateNewsAnalysis = [
  body('newsText')
    .optional()
    .isString()
    .withMessage('newsText must be a string')
    .trim()
    .isLength({ min: 10, max: 25000 })
    .withMessage('newsText must be between 10 and 25000 characters'),

  body('claim')
    .optional()
    .isString()
    .withMessage('claim must be a string')
    .trim()
    .isLength({ min: 10, max: 25000 })
    .withMessage('claim must be between 10 and 25000 characters'),

  // Middleware to handle validation errors and normalize fields
  (req, res, next) => {
    if (!req.body.newsText && !req.body.claim) {
      return responseFormatter.fail(res, 'Validation failed', 400, [
        { msg: 'Either newsText or claim is required', path: 'newsText' }
      ]);
    }

    // Normalize to newsText
    if (!req.body.newsText && req.body.claim) {
      req.body.newsText = req.body.claim;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return responseFormatter.fail(res, 'Validation failed', 400, errors.array());
    }
    next();
  }
];
