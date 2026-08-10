/**
 * 🛠️ One-time migration: Fix Khmer diacritic typo in product categories.
 * Replaces all occurrences of "ទឹកអប" (missing ់) with "ទឹកអប់" in the products table.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/database');

async function fixCategoryText() {
  try {
    console.log('🔧 Fixing category text in products table...');

    // Fix category column
    const catResult = await pool.query(`
      UPDATE products
      SET category = REPLACE(category, 'ទឹកអប (Perfume)', 'ទឹកអប់ (Perfume)')
      WHERE category LIKE '%ទឹកអប%'
        AND category NOT LIKE '%ទឹកអប់%'
      RETURNING id, name, category
    `);
    console.log(`✅ Fixed ${catResult.rowCount} product category rows:`, catResult.rows.map(r => `[${r.id}] ${r.name} → ${r.category}`));

    // Fix product name column (in case any product name also has the typo)
    const nameResult = await pool.query(`
      UPDATE products
      SET name = REPLACE(name, 'ទឹកអប', 'ទឹកអប់')
      WHERE name LIKE '%ទឹកអប%'
        AND name NOT LIKE '%ទឹកអប់%'
      RETURNING id, name
    `);
    console.log(`✅ Fixed ${nameResult.rowCount} product name rows:`, nameResult.rows.map(r => `[${r.id}] ${r.name}`));

    console.log('🎉 Migration complete.');
  } catch (err) {
    console.error('🔴 Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

fixCategoryText();
