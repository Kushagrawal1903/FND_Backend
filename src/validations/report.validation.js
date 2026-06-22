import Joi from 'joi';

export const submitReportSchema = Joi.object({
  title: Joi.string().required().min(3).max(100).messages({
    'string.empty': 'Report title cannot be empty',
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title cannot exceed 100 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().required().min(10).max(1000).messages({
    'string.empty': 'Report description cannot be empty',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 1000 characters',
    'any.required': 'Description is required',
  }),
});
