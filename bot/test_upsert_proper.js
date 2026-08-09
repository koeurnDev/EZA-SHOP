require('dotenv').config();
const userRepository = require('./repositories/userRepository');

async function run() {
  try {
    const res = await userRepository.upsert(7817470099, '', '');
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("UPSERT ERROR:", err);
  } finally {
    process.exit(0);
  }
}

run();
