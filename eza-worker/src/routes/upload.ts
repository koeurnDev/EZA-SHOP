import { Hono } from 'hono';
import { telegramAuth, adminAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Upload image to Cloudinary from base64 or URL
 * POST /api/upload
 */
app.post('/', telegramAuth, async (c) => {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = c.env;

    console.log('[UPLOAD] Starting upload request', {
      path: c.req.path,
      contentType: c.req.header('content-type'),
      hasCloudinaryConfig: !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)
    });

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error('[UPLOAD ERROR] Cloudinary not configured');
      return c.json({ success: false, error: 'Image upload not configured' }, 500);
    }

    const contentType = c.req.header('content-type') || '';
    let fileData: string | null = null;
    let fileName = `receipt_${Date.now()}`;

    // Detect folder based on request path (admin uploads go to products folder)
    const isAdminUpload = c.req.path.includes('/admin/upload');
    if (isAdminUpload && !c.get('isAdmin')) {
      // Must be admin to upload to products folder
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    const folder = isAdminUpload ? 'products' : 'receipts';

    console.log('[UPLOAD] Processing file', { folder, contentType });

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form upload
      const formData = await c.req.formData();
      const file = formData.get('image') as File | null;

      if (!file) {
        console.error('[UPLOAD ERROR] No image file in form data');
        return c.json({ success: false, error: 'No image file provided' }, 400);
      }

      console.log('[UPLOAD] File received', { name: file.name, type: file.type, size: file.size });

      const buffer = await file.arrayBuffer();
      
      // Convert to base64 using chunk-based approach to avoid stack overflow
      const uint8Array = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 8192; // Process 8KB at a time
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binary);
      const mimeType = file.type || 'image/jpeg';
      fileData = `data:${mimeType};base64,${base64}`;
      fileName = file.name || fileName;
    } else {
      // Handle JSON with base64 or URL
      const body = await c.req.json().catch(() => ({}));
      fileData = body.image || body.file || body.url || null;
      console.log('[UPLOAD] JSON body received', { hasFileData: !!fileData });
    }

    if (!fileData) {
      console.error('[UPLOAD ERROR] No image data provided');
      return c.json({ success: false, error: 'No image data provided' }, 400);
    }

    // Generate Cloudinary signature using SHA-1
    // Cloudinary docs: https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
    const timestamp = Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    
    // Build params string (sorted alphabetically) and append API secret
    // Format: "param1=value1&param2=value2{api_secret}"
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    
    console.log('[UPLOAD] Generating signature', { 
      folder,
      timestamp,
      cloudName: CLOUDINARY_CLOUD_NAME,
      stringToSign: `folder=${folder}&timestamp=${timestamp}` 
    });
    
    // Hash with SHA-1 (NOT HMAC - Cloudinary uses plain SHA-1 with secret appended)
    const msgData = encoder.encode(paramsToSign);
    const sigBuffer = await crypto.subtle.digest('SHA-1', msgData);
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('[UPLOAD] Signature generated', { signature });

    // Upload to Cloudinary
    console.log('[UPLOAD] Uploading to Cloudinary', { 
      url: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      folder
    });

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

    console.log('[UPLOAD] Cloudinary response', { 
      status: uploadRes.status, 
      statusText: uploadRes.statusText,
      ok: uploadRes.ok
    });

    const uploadData = await uploadRes.json() as any;

    if (!uploadData.secure_url) {
      console.error('[UPLOAD ERROR] Cloudinary upload failed:', {
        status: uploadRes.status,
        statusText: uploadRes.statusText,
        error: uploadData.error,
        message: uploadData.error?.message,
        folder: folder,
        timestamp: timestamp,
        fullResponse: uploadData
      });
      return c.json({ 
        success: false, 
        error: uploadData.error?.message || 'Image upload failed',
        details: uploadData.error || uploadData 
      }, 500);
    }

    console.log('[UPLOAD] Success!', { url: uploadData.secure_url });
    return c.json({ success: true, data: { url: uploadData.secure_url } });
  } catch (error) {
    console.error('[UPLOAD ERROR] Exception:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return c.json({ 
      success: false, 
      error: 'Upload failed',
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * POST /api/upload/delete - Delete image from Cloudinary
 */
app.post('/delete', telegramAuth, adminAuth, async (c) => {
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
