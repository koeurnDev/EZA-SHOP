import { eq, desc, and, gte } from 'drizzle-orm';
import { products } from '../db/schema';
import { getEffectivePrice, parseJsonSafe } from '../utils/helpers';
import type { DrizzleDB } from '../types';

export class ProductService {
  private db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  formatProduct(p: any) {
    return {
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
  }

  async getAllProducts() {
    const allProducts = await this.db
      .select()
      .from(products)
      .where(gte(products.stock, 1))
      .orderBy(desc(products.created_at));

    return allProducts.map(p => this.formatProduct(p));
  }

  async getProductById(productId: number) {
    const product = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      return null;
    }

    return this.formatProduct(product[0]);
  }

  async getProductsByCategory(category: string) {
    const categoryProducts = await this.db
      .select()
      .from(products)
      .where(and(eq(products.category, category), gte(products.stock, 1)))
      .orderBy(desc(products.created_at));

    return categoryProducts.map(p => this.formatProduct(p));
  }
}
