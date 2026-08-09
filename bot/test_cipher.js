const crypto = require('crypto');
try {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.update(1234, 'utf8', 'hex');
  console.log("No error");
} catch (err) {
  console.log("Error thrown:", err.message);
}
