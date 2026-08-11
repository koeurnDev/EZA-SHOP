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
      details: errors.array().map(e => ({ 
        field: e.path || e.param || 'field', 
        message: e.msg 
      })) 
    });
  }

  // 🛡️ Security Fix: Strict Whitelisting (Anti-Mass Assignment)
  // Replaces req.body with ONLY the fields that passed validation. 
  req.body = matchedData(req, { includeOptionals: true, locations: ['body'] });
  
  next();
};

/**
 * Schemas for different routes
 */
const schemas = {
  order: [
    body('userId').optional(),
    body('userName').optional().trim().isString(),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('items.*.id')
      .notEmpty().withMessage('Item ID is required')
      .customSanitizer(v => (v !== null && v !== undefined) ? String(v) : v)
      .isString().withMessage('Item ID is required'),
    body('items.*.name').optional().trim().isString(),
    body('items.*.price').optional().isFloat({ min: 0 }),
    body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    body('items.*.variant').optional(),
    body('items.*.cartKey').optional(),
    body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
    body('deliveryInfo').isObject().withMessage('Delivery info is required'),
    body('deliveryInfo.phone')
      .notEmpty().withMessage('Phone number is required')
      .trim()
      .matches(/^[0-9\s\+\-\(\)]{8,15}$/).withMessage('Invalid phone number format. Must be 8-15 digits.'),
    body('deliveryInfo.address').notEmpty().trim().withMessage('Address is required'),
    body('deliveryInfo.province').optional().trim().isString(),
    body('deliveryInfo.note').optional().trim().isString(),
    body('deliveryInfo.deliveryCompany').optional().trim().isString(),
    body('deliveryInfo.paymentMethod').optional().trim().isString(),
    body('idempotencyKey').optional().trim().isString(),
    body('couponCode').optional().trim().isString(),
    validate
  ],
  product: [
    body('name').notEmpty().trim().isString().isLength({ min: 2 }).withMessage('Name must be at least 2 chars'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('category').notEmpty().trim().isString().withMessage('Category is required'),
    body('description').optional().trim().isString(),
    body('stock').optional().isInt({ min: 0 }),
    body('variants').optional().isArray(),
    body('image').optional().trim().isString(),
    body('additional_images').optional(),
    body('video_url').optional().trim().isString(),
    body('flash_sale_price').optional().customSanitizer(v => v === '' ? null : v).isFloat({ min: 0 }).optional({ nullable: true }),
    body('flash_sale_end').optional().customSanitizer(v => v === '' ? null : v).isString().optional({ nullable: true }),
    validate
  ],
  setting: [
    body('key').notEmpty().trim().withMessage('Key is required'),
    body('value').optional(),
    validate
  ],
  coupon: [
    body('code').notEmpty().trim().isString().toUpperCase(),
    body('discount_type').isString().isIn(['fixed', 'percent']),
    body('value').isFloat({ min: 0 }),
    validate
  ]
};

module.exports = schemas;
