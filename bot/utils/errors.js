/**
 * MO-MO Elite Error System
 * Standardized error classes for consistent API responses.
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as expected error (e.g. validation) vs programming error

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message || 'Validation failed', 400);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message || 'Resource not found', 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message || 'Unauthorized access', 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message || 'Access denied', 403);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError
};
