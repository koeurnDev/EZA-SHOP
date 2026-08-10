const { body, validationResult, matchedData } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`⚠️ Validation Fail on ${req.originalUrl}:`, errors.array());
    return res.status(400).json({ 
      success: false, 
      error: 'Validation Error', 
      details: errors.array().map(e => ({ field: e.path, message: e.msg })) 
    });
  }

  // 🛡️ Security Fix: Strict Whitelisting (Anti-Mass Assignment)
  // Replaces req.body with ONLY the fields that passed validation. 
  // Any undocumented/injected fields (e.g. role: admin) are safely dropped.
  req.body = matchedData(req, { includeOptionals: true, locations: ['body'] });
  
  next();
};

/**
 * Schemas for different routes
 */
const schemas = {
  order: [
    body('userId').optional(),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.id').notEmpty().isString().withMessage('Item ID is required'),
    body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
    body('deliveryInfo').isObject().withMessage('Delivery info is required'),
    body('deliveryInfo.phone')
      .notEmpty().withMessage('Phone number is required')
      .trim()
      .escape()
      .matches(/^[0-9\s\+\-\(\)]{8,15}$/).withMessage('Invalid phone number format. Must be 8-15 digits.'),
    body('deliveryInfo.address').notEmpty().trim().escape().withMessage('Address is required'),
    body('idempotencyKey').optional().trim().escape().isString(),
    validate
  ],
  product: [
    body('name').notEmpty().trim().escape().isString().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').notEmpty().trim().escape().isString().withMessage('Category is required'),
    body('description').optional().trim().escape().isString(),
    body('stock').optional().isInt({ min: 0 }),
    body('variants').optional().isArray(),
    validate
  ],
  setting: [
    body('key').notEmpty().trim().escape().withMessage('Key is required'),
    validate
  ],
  coupon: [
    body('code').notEmpty().trim().escape().isString().toUpperCase(),
    body('discount_type').isString().isIn(['fixed', 'percent']),
    body('value').isFloat({ min: 0 }),
    validate
  ]
};

module.exports = schemas;
