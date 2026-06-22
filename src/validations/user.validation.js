import Joi from 'joi';

export const saveArticleSchema = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Article title cannot be empty',
    'any.required': 'Title is required',
  }),
  url: Joi.string().required().uri().messages({
    'string.empty': 'Article URL cannot be empty',
    'string.uri': 'Please provide a valid URL',
    'any.required': 'URL is required',
  }),
  verdict: Joi.string().required().messages({
    'string.empty': 'Article verdict is required',
    'any.required': 'Verdict is required',
  }),
  notes: Joi.string().allow('').max(500).messages({
    'string.max': 'Notes cannot exceed 500 characters',
  }),
});
