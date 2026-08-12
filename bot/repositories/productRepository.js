const pool = require('../config/database');
const cacheService = require('../services/cacheService');

const CACHE_TTL = {
  products: 300,        // 5 minutes
  inventory: 60,        // 1 minute
};

const CACHE_KEYS = {
  allProducts: 'products:all',
  minimalProducts: 'products:minimal',
  inventoryStats: 'products:inventory:stats'
};

const safeJsonParse = (val, fallback = []) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch (e) { return fallback; }
};

const productRepository = {
  findAll: async (limit = 100, offset = 0) => {
    if (offset === 0 && limit === 100) {
      return await cacheService.getOrFetch(
        CACHE_KEYS.allProducts,
        async () => {
          const res = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
          return res.rows;
        },
        CACHE_TTL.products
      );
    }

    const res = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.rows;
  },

  findWithFilters: async (options = {}) => {
    const limit = Math.min(parseInt(options.limit) || 20, 100);
    const offset = parseInt(options.offset) || 0;
    const search = options.search || '';
    const category = options.category || 'all';
    const minPrice = parseFloat(options.minPrice) || 0;
    const maxPrice = parseFloat(options.maxPrice) || 999999;
    const sort = options.sort || 'newest';
    
    let query = 'SELECT * FROM products WHERE price >= $1 AND price <= $2';
    const params = [minPrice, maxPrice];
    let paramIndex = 3;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR id::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category !== 'all') {
      if (category === 'flash_sale') {
        query += ` AND flash_sale_price IS NOT NULL AND flash_sale_end > NOW()`;
      } else {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }
    }

    if (sort === 'price_asc') {
      query += ` ORDER BY price ASC`;
    } else if (sort === 'price_desc') {
      query += ` ORDER BY price DESC`;
    } else {
      query += ` ORDER BY (stock > 0) DESC, id DESC`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const res = await pool.query(query, params);
    
    let countQuery = 'SELECT COUNT(*) FROM products WHERE price >= $1 AND price <= $2';
    const countParams = [minPrice, maxPrice];
    let cIndex = 3;
    if (search) { countQuery += ` AND name ILIKE $${cIndex}`; countParams.push(`%${search}%`); cIndex++; }
    if (category !== 'all') {
      if (category === 'flash_sale') { countQuery += ` AND flash_sale_price IS NOT NULL AND flash_sale_end > NOW()`; }
      else { countQuery += ` AND category = $${cIndex}`; countParams.push(category); cIndex++; }
    }
    const countRes = await pool.query(countQuery, countParams);
    
    return {
      products: res.rows,
      total: parseInt(countRes.rows[0].count)
    };
  },

  findAllMinimal: async () => {
    return await cacheService.getOrFetch(
      CACHE_KEYS.minimalProducts,
      async () => {
        const res = await pool.query('SELECT id, name, price, stock, category, image, video_url, flash_sale_price, flash_sale_end FROM products ORDER BY id DESC');
        return res.rows;
      },
      CACHE_TTL.products
    );
  },

  findById: async (id) => {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) return null;
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [numericId]);
    return res.rows[0];
  },

  findByIds: async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (numericIds.length === 0) return [];

    const res = await pool.query('SELECT * FROM products WHERE id = ANY($1::integer[])', [numericIds]);
    return res.rows;
  },

  create: async (p) => {
    const variantsJson = JSON.stringify(safeJsonParse(p.variants, []));
    const addImagesJson = JSON.stringify(safeJsonParse(p.additional_images, []));

    const res = await pool.query(
      'INSERT INTO products (name, category, price, image, stock, description, additional_images, flash_sale_price, flash_sale_end, video_url, variants) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb) RETURNING *',
      [p.name, p.category, p.price, p.image, p.stock || 0, p.description || '', addImagesJson, p.flash_sale_price || null, p.flash_sale_end || null, p.video_url || null, variantsJson]
    );

    Promise.all([
      cacheService.clearPattern('products:*'),
      cacheService.delete('system:init:data'),
      cacheService.delete('admin:dashboard_data'),
      cacheService.delete('admin:advanced_analytics')
    ]).catch(err => console.error('Cache invalidate error:', err.message));

    return res.rows[0];
  },

  update: async (id, p) => {
    const numericId = parseInt(id, 10);
    const variantsJson = JSON.stringify(safeJsonParse(p.variants, []));
    const addImagesJson = JSON.stringify(safeJsonParse(p.additional_images, []));

    const res = await pool.query(
      'UPDATE products SET name = $1, category = $2, price = $3, image = $4, stock = $5, description = $6, additional_images = $7::jsonb, flash_sale_price = $8, flash_sale_end = $9, video_url = $10, variants = $11::jsonb WHERE id = $12 RETURNING *',
      [p.name, p.category, p.price, p.image, p.stock, p.description, addImagesJson, p.flash_sale_price, p.flash_sale_end, p.video_url, variantsJson, numericId]
    );

    Promise.all([
      cacheService.clearPattern('products:*'),
      cacheService.delete('system:init:data'),
      cacheService.delete('admin:dashboard_data'),
      cacheService.delete('admin:advanced_analytics')
    ]).catch(err => console.error('Cache invalidate error:', err.message));

    return res.rows[0];
  },

  deductStock: async (id, qty) => {
    const numericId = parseInt(id, 10);
    const res = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *',
      [qty, numericId]
    );
    return res.rows[0];
  },

  deductStockBatch: async (items, client = pool) => {
    const ids = [...new Set(items.map(i => parseInt(i.id, 10)).filter(id => !isNaN(id)))];
    if (ids.length === 0) return [];

    const { rows: products } = await client.query(
      `SELECT * FROM products WHERE id = ANY($1::integer[]) FOR UPDATE`,
      [ids]
    );

    if (products.length < ids.length) {
      throw new Error('Some products were not found during stock deduction.');
    }

    const productsById = {};
    for (const p of products) {
      productsById[p.id] = { ...p, variants: safeJsonParse(p.variants, []) };
    }

    for (const item of items) {
      const p = productsById[item.id];
      if (!p) continue;

      if (item.variant) {
        const v = p.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
        if (!v || v.stock < item.quantity) {
          throw new Error(`Out of stock for variant ${item.variant.color || ''} ${item.variant.size || ''} of ${p.name}`);
        }
        v.stock -= item.quantity;
      } else {
        if (p.stock < item.quantity) {
          throw new Error(`Out of stock for ${p.name}`);
        }
        p.stock -= item.quantity;
      }
    }

    // Concurrent DB batch updates to minimize FOR UPDATE lock retention
    await Promise.all(
      Object.values(productsById).map(p =>
        client.query(
          `UPDATE products SET stock = $1, variants = $2::jsonb WHERE id = $3`,
          [p.stock, JSON.stringify(p.variants), p.id]
        )
      )
    );
    
    cacheService.clearPattern('products:*').catch(() => {});
    cacheService.delete('system:init:data').catch(() => {});
    
    return Object.values(productsById);
  },

  restoreStockBatch: async (items, clientParam = null) => {
    const dbClient = clientParam || pool;
    const ids = Array.from(new Set(items.map(i => parseInt(i.id, 10)).filter(Boolean)));
    if (ids.length === 0) return [];

    const res = await dbClient.query(
      `SELECT id, name, stock, variants FROM products WHERE id = ANY($1::int[]) FOR UPDATE`,
      [ids]
    );

    const productsById = {};
    for (const p of res.rows) {
      productsById[p.id] = { ...p, variants: safeJsonParse(p.variants, []) };
    }

    for (const item of items) {
      const p = productsById[item.id];
      if (!p) continue;
      const qty = parseInt(item.quantity) || 1;

      if (item.variant) {
        const v = p.variants.find(v => v.color === item.variant.color && v.size === item.variant.size);
        if (v) {
          v.stock = (parseInt(v.stock) || 0) + qty;
        }
      }
      p.stock = (parseInt(p.stock) || 0) + qty;
    }

    await Promise.all(
      Object.values(productsById).map(p =>
        dbClient.query(
          `UPDATE products SET stock = $1, variants = $2::jsonb WHERE id = $3`,
          [p.stock, JSON.stringify(p.variants), p.id]
        )
      )
    );
    
    cacheService.clearPattern('products:*').catch(() => {});
    cacheService.delete('system:init:data').catch(() => {});
    
    return Object.values(productsById);
  },

  addStock: async (id, qty) => {
    const numericId = parseInt(id, 10);
    const res = await pool.query(
      'UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING *',
      [qty, numericId]
    );
    await cacheService.clearPattern('products:*');
    return res.rows[0];
  },

  getInventoryStats: async () => {
    return await cacheService.getOrFetch(
      CACHE_KEYS.inventoryStats,
      async () => {
        const res = await pool.query('SELECT COUNT(*) FILTER (WHERE stock > 0) as "inStock", COUNT(*) as total FROM products');
        return res.rows[0];
      },
      CACHE_TTL.inventory
    );
  },

  delete: async (id) => {
    const numericId = parseInt(id, 10);
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [numericId]);
    Promise.all([
      cacheService.clearPattern('products:*'),
      cacheService.delete('system:init:data'),
      cacheService.delete('admin:dashboard_data'),
      cacheService.delete('admin:advanced_analytics')
    ]).catch(err => console.error('Cache invalidate error:', err.message));
    return res.rows[0];
  }
};

module.exports = productRepository;
