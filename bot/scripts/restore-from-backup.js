#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function restoreFromBackup() {
  const backupPath = path.join(__dirname, '../backups/momo_backup_2026-04-27T01-34-33-017Z.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    process.exit(1);
  }

  console.log('📥 Reading backup file...');
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  
  console.log(`🗄️  Found ${backup.products?.length || 0} products in backup`);
  console.log(`📦 Found ${backup.orders?.length || 0} orders in backup`);

  // Check if products already exist
  const existingProducts = await pool.query('SELECT COUNT(*) as count FROM products');
  const productCount = parseInt(existingProducts.rows[0].count);
  
  if (productCount > 0) {
    console.log(`⚠️  Database already has ${productCount} products. Skipping product restore.`);
    console.log('✅ Restore complete (no changes needed)');
    await pool.end();
    return;
  }

  // Restore products
  if (backup.products && backup.products.length > 0) {
    console.log('🔄 Restoring products...');
    
    for (const product of backup.products) {
      const { id, name, price, category, image, stock, description, additional_images } = product;
      
      await pool.query(`
        INSERT INTO products (id, name, price, category, image, stock, description, additional_images)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [id, name, price, category || '', image || '', stock || 0, description || '', additional_images || '[]']);
      
      console.log(`✅ Product #${id}: ${name}`);
    }

    // Update sequence to prevent ID conflicts
    const maxId = Math.max(...backup.products.map(p => p.id));
    await pool.query(`SELECT setval('products_id_seq', $1, true)`, [maxId]);
    console.log(`🔢 Updated product ID sequence to ${maxId}`);
  }

  console.log('✅ Backup restore complete!');
  console.log('🧪 Running smoke test...');
  
  // Quick verification
  const finalCount = await pool.query('SELECT COUNT(*) as count FROM products');
  console.log(`📊 Total products in database: ${finalCount.rows[0].count}`);
  
  await pool.end();
}

restoreFromBackup().catch((error) => {
  console.error('❌ Error during restore:', error);
  process.exit(1);
});