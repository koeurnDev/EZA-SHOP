const db = require('../config/database');
const cacheService = require('../services/cacheService');

const parseFaqId = (idParam) => {
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return null;
  return id;
};

exports.getFaqs = async (req, res) => {
  try {
    const faqs = await cacheService.getOrFetch('faqs:public', async () => {
      const { rows } = await db.query('SELECT * FROM faqs WHERE is_active = true ORDER BY sort_order ASC, id ASC');
      return rows;
    }, 300);

    res.json({ success: true, faqs: faqs || [] });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch FAQs' });
  }
};

exports.getAdminFaqs = async (req, res) => {
  try {
    const faqs = await cacheService.getOrFetch('faqs:admin', async () => {
      const { rows } = await db.query('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC');
      return rows;
    }, 180);

    res.json({ success: true, faqs: faqs || [] });
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
    const values = [
      q_kh || '', 
      q_en || '', 
      a_kh || '', 
      a_en || '', 
      parseInt(sort_order) || 0, 
      is_active ?? true
    ];
    
    const { rows } = await db.query(query, values);

    // Invalidate FAQ caches
    cacheService.delete('faqs:public');
    cacheService.delete('faqs:admin');

    res.json({ success: true, faq: rows[0] });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to create FAQ' });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const id = parseFaqId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ ID' });
    }

    const { q_kh, q_en, a_kh, a_en, sort_order, is_active } = req.body;

    // 🛡️ COALESCE ensures partial updates preserve existing data instead of overwriting with NULL
    const query = `
      UPDATE faqs 
      SET 
        q_kh = COALESCE($1, q_kh), 
        q_en = COALESCE($2, q_en), 
        a_kh = COALESCE($3, a_kh), 
        a_en = COALESCE($4, a_en), 
        sort_order = COALESCE($5, sort_order), 
        is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [
      q_kh !== undefined ? q_kh : null,
      q_en !== undefined ? q_en : null,
      a_kh !== undefined ? a_kh : null,
      a_en !== undefined ? a_en : null,
      sort_order !== undefined ? parseInt(sort_order) : null,
      is_active !== undefined ? Boolean(is_active) : null,
      id
    ];

    const { rows } = await db.query(query, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }
    
    // Invalidate FAQ caches
    cacheService.delete('faqs:public');
    cacheService.delete('faqs:admin');

    res.json({ success: true, faq: rows[0] });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to update FAQ' });
  }
};

exports.deleteFaq = async (req, res) => {
  try {
    const id = parseFaqId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid FAQ ID' });
    }

    const { rowCount } = await db.query('DELETE FROM faqs WHERE id = $1', [id]);
    
    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'FAQ not found' });
    }
    
    // Invalidate FAQ caches
    cacheService.delete('faqs:public');
    cacheService.delete('faqs:admin');

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ success: false, error: 'Failed to delete FAQ' });
  }
};
