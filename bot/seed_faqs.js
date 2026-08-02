require('dotenv').config();
const db = require('./config/database');

async function seedFaqs() {
  const query = `
    INSERT INTO faqs (q_kh, q_en, a_kh, a_en, sort_order) VALUES 
    ('តើការដឹកជញ្ជូនចំណាយពេលប៉ុន្មាន?', 'How long does delivery take?', 'សម្រាប់ភ្នំពេញក្នុងរយ:ពេល ២៤-៤៨ ម៉ោង និងខេត្តក្រៅ ១-៣ ថ្ងៃ។', 'Typically 24-48 hours in Phnom Penh and 1-3 days for provinces.', 1), 
    ('តើខ្ញុំអាចប្តូរអីវ៉ាន់បានទេ?', 'Can I return or exchange items?', 'លោកអ្នកអាចប្តូរបានក្នុងរយ:ពេល ៣ ថ្ងៃប្រសិនបើមានការខូចខាតពីហាង។', 'Returns or exchanges are accepted within 3 days for shop defects.', 2), 
    ('តើការបង់ប្រាក់មានអមជាមួយអ្វីខ្លះ?', 'What are the payment methods?', 'ហាងយើងខ្ញុំទទួលការបង់តាម ABA, Bakong KHQR និងសាច់ប្រាក់សុទ្ធ។', 'We accept ABA, Bakong KHQR, and Cash on Delivery.', 3);
  `;
  try {
    await db.query(query);
    console.log('Seeded FAQs');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

seedFaqs();
