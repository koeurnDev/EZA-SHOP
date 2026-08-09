const pool = require('./config/database');
const userRepository = require('./repositories/userRepository');

async function test() {
  try {
    const res1 = await userRepository.upsert(123456, '', '');
    console.log("Success:", res1.id);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
