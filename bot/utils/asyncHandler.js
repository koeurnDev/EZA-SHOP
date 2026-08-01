/**
 * MO-MO Elite Async Handler Wrapper
 * Eliminates the need for repetitive try-catch blocks in controllers.
 * Automatically catches errors and passes them to the global error middleware.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = asyncHandler;
