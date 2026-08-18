export function getUiAvatarUrl(name, userId) {
  const label = encodeURIComponent((name || `User ${String(userId || '').slice(-4)}`).trim() || 'User');
  return `https://ui-avatars.com/api/?name=${label}&background=3b82f6&color=fff&size=128&bold=true`;
}

export function getCustomerAvatarSrc(user, backendUrl, initData) {
  const id = user?.user_id;
  const name = user?.user_name || user?.username;
  const fallback = getUiAvatarUrl(name, id);

  if (!id || !backendUrl) return fallback;

  const photoUrl = user?.photo_url || '';
  if (photoUrl) {
    return photoUrl;
  }

  if (initData) {
    return `${backendUrl}/api/admin/avatar/${id}?tg=${encodeURIComponent(initData)}`;
  }

  return fallback;
}
