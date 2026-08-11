const cloudinary = require('cloudinary').v2;

// 🛡️ Startup Validation: Fail early and loudly if Cloudinary credentials are missing
const CLOUDINARY_REQUIRED = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinary = CLOUDINARY_REQUIRED.filter(k => !process.env[k]);

if (missingCloudinary.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`🔴 CRITICAL: Missing Cloudinary env vars in production: ${missingCloudinary.join(', ')}`);
  } else {
    console.warn(`⚠️ Cloudinary: Missing env vars (${missingCloudinary.join(', ')}). Image uploads will fail.`);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS for asset delivery
});

console.log('🔌 Cloudinary: Configured (secure=true)');

module.exports = cloudinary;
