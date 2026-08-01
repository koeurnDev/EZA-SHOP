const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');

/**
 * MO-MO Elite Upload Service (v6 Optimized)
 * Features: Server-side Compression, Resizing, and WebP Conversion.
 * Ensures that admin uploads don't bloat storage or slow down the frontend.
 */
const uploadService = {
  uploadImage: async (file) => {
    if (!file) throw new Error('No file provided');
    
    if (file.mimetype.startsWith('video/')) {
      const b64 = file.buffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const res = await cloudinary.uploader.upload(dataURI, {
        folder: 'products_videos',
        resource_type: 'video'
      });
      return res.secure_url;
    }
    
    // 🛠️ Optimization Pipeline:
    // 1. Resize to max 1000px width (maintaining aspect ratio)
    // 2. Convert to WebP for superior compression
    // 3. Compress quality to 80% (Sweet spot for quality/size)
    const optimizedBuffer = await sharp(file.buffer)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Convert buffer to base64 for Cloudinary
    const b64 = optimizedBuffer.toString('base64');
    const dataURI = 'data:image/webp;base64,' + b64;
    
    const res = await cloudinary.uploader.upload(dataURI, {
      folder: 'products',
      resource_type: 'image'
    });
    
    return res.secure_url;
  }
};

module.exports = uploadService;
