import { Hono } from 'hono';
import { telegramAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Upload image to Cloudinary from base64 or URL
 * POST /api/upload
 */
app.post('/', telegramAuth, async (c) => {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = c.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return c.json({ success: false, error: 'Image upload not configured' }, 500);
    }

    const contentType = c.req.header('content-type') || '';
    let fileData: string | null = null;
    let fileName = `receipt_${Date.now()}`;

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form upload
      const formData = await c.req.formData();
      const file = formData.get('image') as File | null;

      if (!file) {
        return c.json({ success: false, error: 'No image file provided' }, 400);
      }

      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const mimeType = file.type || 'image/jpeg';
      fileData = `data:${mimeType};base64,${base64}`;
      fileName = file.name || fileName;
    } else {
      // Handle JSON with base64 or URL
      const body = await c.req.json().catch(() => ({}));
      fileData = body.image || body.file || body.url || null;
    }

    if (!fileData) {
      return c.json({ success: false, error: 'No image data provided' }, 400);
    }

    // Generate Cloudinary signature
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'receipts';
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    // Sign using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(CLOUDINARY_API_SECRET);
    const msgData = encoder.encode(paramsToSign);

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);

    // Cloudinary uses SHA-1 for signing — use a simpler approach
    const signStr = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signHash = await crypto.subtle.digest('SHA-1', encoder.encode(signStr));
    const signature = Array.from(new Uint8Array(signHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append('file', fileData);
    uploadFormData.append('api_key', CLOUDINARY_API_KEY);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('folder', folder);
    uploadFormData.append('signature', signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: uploadFormData }
    );

    const uploadData = await uploadRes.json() as any;

    if (!uploadData.secure_url) {
      console.error('Cloudinary upload failed:', uploadData);
      return c.json({ success: false, error: 'Image upload failed' }, 500);
    }

    return c.json({ success: true, url: uploadData.secure_url });
  } catch (error) {
    console.error('upload error:', error);
    return c.json({ success: false, error: 'Upload failed' }, 500);
  }
});

/**
 * POST /api/upload/delete - Delete image from Cloudinary
 */
app.post('/delete', telegramAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body;
    if (!url) return c.json({ success: true }); // no-op

    // Extract public_id from Cloudinary URL
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    if (!match) return c.json({ success: true });

    const publicId = match[1];
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = c.env;

    const timestamp = Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const signStr = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signHash = await crypto.subtle.digest('SHA-1', encoder.encode(signStr));
    const signature = Array.from(new Uint8Array(signHash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('timestamp', timestamp.toString());
    form.append('signature', signature);

    await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST', body: form,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: true }); // non-critical, always succeed
  }
});

export default app;
