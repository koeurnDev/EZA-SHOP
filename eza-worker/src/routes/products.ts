import { Hono } from 'hono';
import { createDb } from '../db/connection';
import { ProductService } from '../services/productService';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/products - Get all products with stock > 0
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const productService = new ProductService(db);
    
    const formattedProducts = await productService.getAllProducts();

    c.header('Cache-Control', 'public, max-age=15, s-maxage=60');
    return c.json({
      success: true,
      products: formattedProducts,
      total: formattedProducts.length,
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/products/:id - Get single product
 */
app.get('/:id', async (c) => {
  try {
    const productId = parseInt(c.req.param('id'));
    if (isNaN(productId)) {
      return c.json({ success: false, error: 'Invalid product ID' }, 400);
    }

    const db = createDb(c.env);
    const productService = new ProductService(db);
    
    const formattedProduct = await productService.getProductById(productId);

    if (!formattedProduct) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    return c.json({
      success: true,
      product: formattedProduct,
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/products/category/:category - Get products by category
 */
app.get('/category/:category', async (c) => {
  try {
    const category = decodeURIComponent(c.req.param('category'));
    const db = createDb(c.env);
    const productService = new ProductService(db);
    
    const formattedProducts = await productService.getProductsByCategory(category);

    return c.json({
      success: true,
      products: formattedProducts,
      category,
      total: formattedProducts.length,
    });
  } catch (error) {
    console.error('Category products fetch error:', error);
    return c.json({ 
      success: false, 
      error: 'Failed to fetch category products',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;