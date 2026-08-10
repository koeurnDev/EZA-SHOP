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
    const fs = require('fs');
    const buffer = file.buffer || fs.readFileSync(file.path);
    
    try {
      if (file.mimetype.startsWith('video/')) {
        const b64 = buffer.toString('base64');
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
      const optimizedBuffer = await sharp(buffer)
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
    } finally {
      // 🧹 Clean up the temporary file from disk
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  },

  deleteImageByUrl: async (url) => {
    if (!url || typeof url !== 'string') return;
    try {
      // Extract public_id from Cloudinary URL
      // e.g. https://res.cloudinary.com/dhabxzsx7/image/upload/v1785667246/products/sifiz1w9d59wfa2i0ltr.webp -> products/sifiz1w9d59wfa2i0ltr
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
      if (match && match[1]) {
        const publicId = match[1];
        const isVideo = url.includes('/products_videos/') || url.match(/\.(mp4|mov|avi|webm)$/i);
        await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? 'video' : 'image' });
        console.log(`🗑️ Cloudinary Asset Cleaned: ${publicId}`);
      }
    } catch (err) {
      console.warn(`⚠️ Cloudinary Delete Fail (${url}):`, err.message);
    }
  }
};

module.exports = uploadService;
