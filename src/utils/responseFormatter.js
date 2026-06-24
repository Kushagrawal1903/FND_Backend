/**
 * Standardized Response Formatter
 */

export const responseFormatter = {
  /**
   * Format a successful response
   * @param {Object} res - Express response object
   * @param {any} data - Payload data
   * @param {string} message - Optional success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  success: (res, data, message = 'Success', statusCode = 200, performance = null) => {
    const response = {
      status: 'success',
      message,
      data,
    };
    
    // Automatically promote performance object to the root if passed or found in data
    if (performance) {
      response.performance = performance;
    } else if (data && typeof data === 'object' && data.performance) {
      response.performance = data.performance;
    }
    
    return res.status(statusCode).json(response);
  },

  /**
   * Format an error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {any} errors - Additional validation errors or details
   */
  fail: (res, message = 'Operation failed', statusCode = 400, errors = null) => {
    const response = {
      status: 'fail',
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }
};

export default responseFormatter;
