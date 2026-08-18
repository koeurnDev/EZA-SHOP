import { Hono } from 'hono';
import { eq, desc, and, gte } from 'drizzle-orm';
import { createDb } from '../db/connection';
import { products, categories } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { getEffectivePrice, parseJsonSafe } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/products - Get all products with stock > 0
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    
    const allProducts = await db
      .select()
      .from(products)
      .where(gte(products.stock, 1))
      .orderBy(desc(products.created_at));

    const formattedProducts = allProducts.map(product => ({
      id: product.id,
      name: product.name,
      price: getEffectivePrice(
        parseFloat(product.price),
        product.flash_sale_price ? parseFloat(product.flash_sale_price) : undefined,
        product.flash_sale_end?.toISOString()
      ),
      original_price: parseFloat(product.price),
      category: product.category,
      image: product.image,
      stock: product.stock,
      description: product.description,
      additional_images: parseJsonSafe(product.additional_images as string, []),
      variants: parseJsonSafe(product.variants as string, []),
      flash_sale: {
        active: product.flash_sale_end ? new Date(product.flash_sale_end) > new Date() : false,
        price: product.flash_sale_price ? parseFloat(product.flash_sale_price) : null,
        end_time: product.flash_sale_end?.toISOString() || null,
      },
      video_url: product.video_url,
      created_at: product.created_at.toISOString(),
    }));

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
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    const p = product[0];
    const formattedProduct = {
      id: p.id,
      name: p.name,
      price: getEffectivePrice(
        parseFloat(p.price),
        p.flash_sale_price ? parseFloat(p.flash_sale_price) : undefined,
        p.flash_sale_end?.toISOString()
      ),
      original_price: parseFloat(p.price),
      category: p.category,
      image: p.image,
      stock: p.stock,
      description: p.description,
      additional_images: parseJsonSafe(p.additional_images as string, []),
      variants: parseJsonSafe(p.variants as string, []),
      flash_sale: {
        active: p.flash_sale_end ? new Date(p.flash_sale_end) > new Date() : false,
        price: p.flash_sale_price ? parseFloat(p.flash_sale_price) : null,
        end_time: p.flash_sale_end?.toISOString() || null,
      },
      video_url: p.video_url,
      created_at: p.created_at.toISOString(),
    };

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
    
    const categoryProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.category, category), gte(products.stock, 1)))
      .orderBy(desc(products.created_at));

    const formattedProducts = categoryProducts.map(product => ({
      id: product.id,
      name: product.name,
      price: getEffectivePrice(
        parseFloat(product.price),
        product.flash_sale_price ? parseFloat(product.flash_sale_price) : undefined,
        product.flash_sale_end?.toISOString()
      ),
      original_price: parseFloat(product.price),
      category: product.category,
      image: product.image,
      stock: product.stock,
      description: product.description,
      additional_images: parseJsonSafe(product.additional_images as string, []),
      flash_sale: {
        active: product.flash_sale_end ? new Date(product.flash_sale_end) > new Date() : false,
        price: product.flash_sale_price ? parseFloat(product.flash_sale_price) : null,
        end_time: product.flash_sale_end?.toISOString() || null,
      },
      created_at: product.created_at.toISOString(),
    }));

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