const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit GCM IV

/**
 * 🔒 Enterprise Key Derivation (RFC 5869 HKDF)
 * Derives a high-entropy 256-bit key ONCE at module load to prevent CPU event-loop lag.
 */
const getSecretKey = () => {
  const pepper = process.env.SECURITY_PEPPER || process.env.BOT_TOKEN;
  if (!pepper) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('🛑 SECURITY_PEPPER or BOT_TOKEN is MISSING in Production. Encryption aborted.');
    }
  }
  const secret = pepper || 'MO_MO_STATIC_CRYPTO_FALLBACK_PEPPER_2026';
  return crypto.hkdfSync('sha256', secret, 'momo-salt-v1', 'momo-aes-256-gcm-key', 32);
};

const KEY = getSecretKey();

/**
 * Encrypts sensitive text using pre-derived RFC 5869 256-bit HKDF key
 * @param {string} text - The raw text to encrypt
 * @returns {string} - Combined IV:Tag:EncryptedData
 */
function encrypt(text) {
  if (text === null || text === undefined || text === '') return text;
  const rawText = String(text);
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(rawText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text back to original form or throws operational error on failure
 * @param {string} cipherText - The IV:Tag:EncryptedData string
 * @returns {string} - The original raw text
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.includes(':')) {
    return cipherText;
  }
  
  const parts = cipherText.split(':');
  if (parts.length < 3) return cipherText;

  try {
    const [ivHex, tagHex] = parts;
    const encryptedHex = parts.slice(2).join(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('🔴 Decryption Error:', err.message);
    throw new Error('Decryption failed: Invalid ciphertext or authentication tag mismatch');
  }
}

module.exports = { encrypt, decrypt };
