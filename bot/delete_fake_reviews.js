const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteFakeReviews() {
  console.log('🚀 Deleting fake reviews...');
  try {
    const client = await pool.connect();
    
    // Delete all reviews with the comment "Amazing quality, worth every penny! ✨"
    // or those matching the random user pattern. Let's just delete by comment content.
    const res = await client.query(`
      DELETE FROM reviews 
      WHERE comment = 'Amazing quality, worth every penny! ✨'
      RETURNING *
    `);
    
    console.log(`✅ Deleted ${res.rowCount} fake reviews!`);
    client.release();
  } catch (error) {
    console.error('❌ Failed to delete fake reviews:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

deleteFakeReviews();
