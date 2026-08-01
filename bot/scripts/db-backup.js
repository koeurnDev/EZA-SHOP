require('dotenv').config();
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * MO-MO Elite Database Backup Utility
 * Exports critical tables to JSON format for safety.
 */
const backupDatabase = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const tables = ['products', 'orders', 'users', 'settings', 'coupons'];
  const backupData = {};

  try {
    console.log('📦 Starting Database Backup...');
    
    for (const table of tables) {
      const res = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = res.rows;
      console.log(`✅ Table [${table}]: ${res.rows.length} rows exported.`);
    }

    const fileName = `momo_backup_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    console.log(`\n🎉 Backup Completed! File saved to: ${filePath}`);
    console.log(`💡 Note: Download this file and keep it safe.`);
    
    return filePath;
  } catch (err) {
    console.error('❌ Backup Failed:', err.message);
    throw err;
  }
};

// Run if called directly
if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = backupDatabase;
