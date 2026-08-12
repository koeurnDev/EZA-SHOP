const bot = require('../config/telegram');
const userRepository = require('../repositories/userRepository');
const cacheService = require('./cacheService');

const CACHE_TTL_SEC = 60 * 60; // 1 hour

async function fetchAvatarFileId(userId) {
  if (!bot?.telegram) return null;
  try {
    const photos = await bot.telegram.getUserProfilePhotos(Number(userId), 0, 1);
    if (!photos?.total_count || !photos.photos?.[0]?.length) return null;
    const sizes = photos.photos[0];
    return sizes[sizes.length - 1]?.file_id || null;
  } catch (err) {
    console.warn(`⚠️ getUserProfilePhotos(${userId}):`, err.message);
    return null;
  }
}

async function resolveAvatarFileId(userId, { forceRefresh = false } = {}) {
  const cacheKey = `avatar:file_id:${userId}`;
  if (!forceRefresh) {
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;
  }

  const dbUser = await userRepository.findById(String(userId)).catch(() => null);
  if (!forceRefresh && dbUser?.telegram_avatar_file_id) {
    await cacheService.set(cacheKey, dbUser.telegram_avatar_file_id, CACHE_TTL_SEC);
    return dbUser.telegram_avatar_file_id;
  }

  const fileId = await fetchAvatarFileId(userId);
  if (fileId) {
    await userRepository.updateAvatarFileId(String(userId), fileId).catch(() => {});
    await cacheService.set(cacheKey, fileId, CACHE_TTL_SEC);
  }
  return fileId;
}

async function refreshUserAvatar(userId) {
  return resolveAvatarFileId(userId, { forceRefresh: true });
}

async function streamAvatar(userId, res) {
  const fileId = await resolveAvatarFileId(userId);
  if (!fileId || !bot?.telegram) return false;

  try {
    const link = await bot.telegram.getFileLink(fileId);
    const response = await fetch(link.href);
    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
    return true;
  } catch (err) {
    console.warn(`⚠️ streamAvatar(${userId}):`, err.message);
    return false;
  }
}

module.exports = {
  fetchAvatarFileId,
  resolveAvatarFileId,
  refreshUserAvatar,
  streamAvatar,
};
