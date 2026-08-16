export function normalizeSocialLink(type, rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return '';

  if (type === 'email') {
    return value.replace(/^mailto:/i, '').trim();
  }

  if (type === 'whatsapp') {
    if (/^https?:\/\//i.test(value)) return value;
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const intl = digits.startsWith('855') ? digits : `855${digits.replace(/^0/, '')}`;
    return `https://wa.me/${intl}`;
  }

  if (type === 'telegram') {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('t.me/')) return `https://${value}`;
    if (value.includes('t.me/')) return value.startsWith('http') ? value : `https://${value.replace(/^\/\//, '')}`;
    const handle = value.replace(/^@/, '').replace(/\s/g, '');
    return handle ? `https://t.me/${handle}` : '';
  }

  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/\//, '')}`;
}

export function openExternalLink(url) {
  if (!url) return;
  if (url.startsWith('tel:') || url.startsWith('mailto:')) {
    window.location.href = url;
    return;
  }
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink && /^https?:\/\//i.test(url)) {
    try {
      tg.openLink(url);
      return;
    } catch { /* fallback to window.open */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const DEMO_SOCIAL_LINKS = {
  social_fb: 'https://facebook.com/momoboutique',
  social_tg: 'https://t.me/momo_boutique_bot',
  social_ig: 'https://instagram.com/momoboutique',
  social_tt: 'https://tiktok.com/@momoboutique',
  social_email: 'contact@momoboutique.com',
  shop_phone: '012345678',
  shop_address: 'Phnom Penh, Cambodia',
  shop_hours: '8:00 AM – 9:00 PM',
  social_wa: '85512345678',
};

export const SOCIAL_LINK_DEFS = [
  { id: 'tg', field: 'socialTg', label: 'Telegram', color: '#229ED9' },
  { id: 'wa', field: 'socialWa', label: 'WhatsApp', color: '#25D366' },
  { id: 'fb', field: 'socialFb', label: 'Facebook', color: '#1877F2' },
  { id: 'ig', field: 'socialIg', label: 'Instagram', color: '#E4405F', gradient: 'linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%)' },
  { id: 'tt', field: 'socialTt', label: 'TikTok', color: '#000000', darkIcon: true },
  { id: 'email', field: 'socialEmail', label: 'Email', color: '#EA4335', isEmail: true },
];

export function buildTelLink(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const intl = digits.startsWith('855') ? digits : `855${digits.replace(/^0/, '')}`;
  return `tel:+${intl}`;
}

export function buildMapsLink(address) {
  const raw = (address || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`;
}

export function buildSocialLinkItems(shopSocial = {}) {
  return SOCIAL_LINK_DEFS.map((def) => {
    const raw = shopSocial[def.field];
    if (!raw) return null;
    const url = def.isEmail ? `mailto:${raw.replace(/^mailto:/i, '')}` : raw;
    return { ...def, url };
  }).filter(Boolean);
}
