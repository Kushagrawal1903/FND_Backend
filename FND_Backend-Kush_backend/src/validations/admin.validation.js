import Joi from 'joi';
import { ROLES, VERDICTS, REPORT_STATUS } from '../config/constants.js';

// MongoDB ObjectId Regex
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdValidator = Joi.string().pattern(objectIdRegex).messages({
  'string.pattern.base': 'Must be a valid 24-character hexadecimal MongoDB ObjectId',
});

// Sources schema helper
const sourceSchema = Joi.object({
  publisher: Joi.string().required(),
  url: Joi.string().uri().required(),
  verdict: Joi.string().required(),
});

/**
 * User CRUD Schemas
 */
export const createUserSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(6),
  role: Joi.string().valid(...Object.values(ROLES)).default(ROLES.USER),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  role: Joi.string().valid(...Object.values(ROLES)),
});

/**
 * FactCheck CRUD Schemas
 */
export const createFactCheckSchema = Joi.object({
  userId: objectIdValidator.allow(null).default(null),
  claim: Joi.string().required().min(5),
  verdict: Joi.string().valid(...Object.values(VERDICTS)).required(),
  confidence: Joi.number().min(0).max(100).required(),
  explanation: Joi.string().required().min(10),
  sources: Joi.array().items(sourceSchema).default([]),
});

export const updateFactCheckSchema = Joi.object({
  userId: objectIdValidator.allow(null),
  claim: Joi.string().min(5),
  verdict: Joi.string().valid(...Object.values(VERDICTS)),
  confidence: Joi.number().min(0).max(100),
  explanation: Joi.string().min(10),
  sources: Joi.array().items(sourceSchema),
});

/**
 * Report CRUD Schemas
 */
export const createReportSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(1000),
  status: Joi.string().valid(...Object.values(REPORT_STATUS)).default(REPORT_STATUS.PENDING),
  createdBy: objectIdValidator.required(),
});

export const updateReportSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().min(10).max(1000),
  status: Joi.string().valid(...Object.values(REPORT_STATUS)),
  createdBy: objectIdValidator,
});

/**
 * SavedArticle CRUD Schemas
 */
export const createSavedArticleSchema = Joi.object({
  userId: objectIdValidator.required(),
  title: Joi.string().required(),
  url: Joi.string().uri().required(),
  verdict: Joi.string().required(),
  notes: Joi.string().allow('').default(''),
});

export const updateSavedArticleSchema = Joi.object({
  userId: objectIdValidator,
  title: Joi.string(),
  url: Joi.string().uri(),
  verdict: Joi.string(),
  notes: Joi.string().allow(''),
});
