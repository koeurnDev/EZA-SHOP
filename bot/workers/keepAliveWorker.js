const imageHealthService = require('../services/imageHealthService');

const PING_INTERVAL_MS = 10 * 60 * 1000; // Render free tier sleeps ~after 15 min idle
const IMAGE_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000; // Daily broken-image scan

let pingTimer = null;
let scanTimer = null;

function resolveAliveUrl() {
  const explicit = process.env.KEEP_ALIVE_URL?.replace(/\/$/, '');
  if (explicit) return `${explicit}/api/alive`;

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  if (renderUrl) return `${renderUrl}/api/alive`;

  const port = process.env.PORT || 5000;
  return `http://127.0.0.1:${port}/api/alive`;
}

async function pingSelf() {
  const url = resolveAliveUrl();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      console.log(`💓 Keep-alive: OK (${url})`);
    } else {
      console.warn(`⚠️ Keep-alive: HTTP ${res.status} (${url})`);
    }
  } catch (err) {
    console.warn(`⚠️ Keep-alive failed (${url}):`, err.message);
  }
}

async function runImageScan() {
  if (process.env.DISABLE_IMAGE_SCAN === 'true') return;
  try {
    console.log('🖼️ Image scan: starting Cloudinary health check...');
    const result = await imageHealthService.scanAndRepairProducts({ clearDb: true });
    console.log(
      `🖼️ Image scan: ${result.scanned} checked, ${result.broken.length} broken` +
      (result.cleared ? `, ${result.cleared} cleared from DB` : '')
    );
  } catch (err) {
    console.warn('⚠️ Image scan failed:', err.message);
  }
}

function start() {
  if (process.env.DISABLE_KEEP_ALIVE === 'true') {
    console.log('ℹ️ Keep-alive worker disabled (DISABLE_KEEP_ALIVE=true)');
    return;
  }

  const url = resolveAliveUrl();
  console.log(`💓 Keep-alive worker: pinging ${url} every ${PING_INTERVAL_MS / 60000} min`);

  pingSelf();
  pingTimer = setInterval(pingSelf, PING_INTERVAL_MS);
  if (pingTimer.unref) pingTimer.unref();

  // First scan 5 min after boot, then daily
  const scanBootTimer = setTimeout(() => {
    runImageScan();
    scanTimer = setInterval(runImageScan, IMAGE_SCAN_INTERVAL_MS);
    if (scanTimer.unref) scanTimer.unref();
  }, 5 * 60 * 1000);
  if (scanBootTimer.unref) scanBootTimer.unref();
}

function stop() {
  if (pingTimer) clearInterval(pingTimer);
  if (scanTimer) clearInterval(scanTimer);
}

module.exports = { start, stop, pingSelf, runImageScan };
