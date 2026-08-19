import React, { useState, useEffect } from 'react';

const UserAvatar = ({ user, backendUrl, initData, size = 40, style = {} }) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const id = user?.user_id || user?.id;
  const name = user?.user_name || user?.username || 'User';
  const initial = name.charAt(0).toUpperCase();

  // Determine sources to try
  const sources = [];
  if (user?.photo_url) {
    sources.push(user.photo_url); // 1. Try saved URL (might be expired)
  }
  if (id && backendUrl && initData) {
    sources.push(`${backendUrl}/api/admin/avatar/${id}?tg=${encodeURIComponent(initData)}`); // 2. Try API proxy
  }
  // 3. Fallback is handled via state (rendering the div)

  const src = sources[srcIndex];
  const isFallback = srcIndex >= sources.length;

  useEffect(() => {
    setSrcIndex(0);
  }, [id, user?.photo_url]);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: size * 0.4,
      flexShrink: 0,
      overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      ...style
    }}>
      {isFallback ? (
        <span style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>{initial}</span>
      ) : (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => {
            setSrcIndex(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};

export default UserAvatar;
