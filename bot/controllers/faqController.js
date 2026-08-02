const db = require('../config/database');

exports.getFaqs = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM faqs WHERE is_active = true ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, faqs: rows });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch FAQs' });
  }
};

exports.getAdminFaqs = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, faqs: rows });
  } catch (error) {
    console.error('Error fetching admin FAQs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch FAQs' });
  }
};

exports.createFaq = async (req, res) => {
  try {
    const { q_kh, q_en, a_kh, a_en, sort_order, is_active } = req.body;
    const query = `
      INSERT INTO faqs (q_kh, q_en, a_kh, a_en, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [q_kh, q_en, a_kh, a_en, sort_order || 0, is_active ?? true];
    const { rows } = await db.query(query, values);
    res.json({ success: true, faq: rows[0] });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to create FAQ' });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { q_kh, q_en, a_kh, a_en, sort_order, is_active } = req.body;
    const query = `
      UPDATE faqs 
      SET q_kh = $1, q_en = $2, a_kh = $3, a_en = $4, sort_order = $5, is_active = $6
      WHERE id = $7
      RETURNING *
    `;
    const values = [q_kh, q_en, a_kh, a_en, sort_order, is_active, id];
    const { rows } = await db.query(query, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }
    
    res.json({ success: true, faq: rows[0] });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to update FAQ' });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM faqs WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to delete FAQ' });
  }
};
