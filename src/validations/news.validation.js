import Joi from 'joi';

export const checkSchema = Joi.object({
  claim: Joi.string().required().min(10).max(1000).messages({
    'string.empty': 'Claim text cannot be empty',
    'string.min': 'Claim text must be at least 10 characters long to verify',
    'string.max': 'Claim text cannot exceed 1000 characters',
    'any.required': 'Claim text is required',
  }),
});

export const analyzeSchema = Joi.object({
  claim: Joi.string().required().min(10).max(5000).messages({
    'string.empty': 'Text to analyze cannot be empty',
    'string.min': 'Text to analyze must be at least 10 characters long',
    'string.max': 'Text to analyze cannot exceed 5000 characters',
    'any.required': 'Claim text/context is required',
  }),
});

export const urlCheckSchema = Joi.object({
  url: Joi.string().required().uri().messages({
    'string.empty': 'URL cannot be empty',
    'string.uri': 'Please provide a valid URL (including http or https)',
    'any.required': 'URL is required',
  }),
});
