/** Delimiter between multiple banners (comma breaks Cloudinary URLs) */
export const BANNER_ENTRY_SEP = '|||';

export function parseBannerTarget(targetStr) {
  if (!targetStr) {
    return { linkType: '', linkValue: '' };
  }

  if (targetStr.startsWith('cat:')) {
    return { linkType: 'cat', linkValue: targetStr.slice(4) };
  }
  if (targetStr.startsWith('ext:')) {
    return { linkType: 'ext', linkValue: targetStr.slice(4) };
  }
  if (targetStr.startsWith('prod:')) {
    return { linkType: 'prod', linkValue: targetStr.slice(5) };
  }

  // Legacy: bare product id
  return { linkType: 'prod', linkValue: targetStr };
}

export function buildBannerTarget(linkType, linkValue) {
  if (!linkType) return '';
  if (linkType === 'prod') return linkValue ? `prod:${linkValue}` : 'prod:';
  if (linkType === 'cat') return linkValue ? `cat:${linkValue}` : 'cat:';
  if (linkType === 'ext') return linkValue ? `ext:${linkValue}` : 'ext:';
  return '';
}

export function splitBannerEntry(entry) {
  const trimmed = (entry || '').trim();
  if (!trimmed) return { url: '', targetStr: null };

  const pipe = trimmed.indexOf('|');
  if (pipe === -1) {
    return { url: trimmed, targetStr: null };
  }

  return {
    url: trimmed.slice(0, pipe).trim(),
    targetStr: trimmed.slice(pipe + 1).trim() || null
  };
}

export function parseBannerEntries(raw) {
  if (!raw || typeof raw !== 'string') return [];

  const chunks = raw.includes(BANNER_ENTRY_SEP)
    ? raw.split(BANNER_ENTRY_SEP)
    : raw.split(',');

  return chunks
    .map((chunk) => {
      const { url, targetStr } = splitBannerEntry(chunk);
      if (!url) return null;

      const { linkType, linkValue } = parseBannerTarget(targetStr);
      const hasTarget = linkType && linkValue;

      return {
        url,
        linkType: linkType || null,
        targetId: hasTarget ? linkValue : null,
        targetStr,
        rawTarget: targetStr || buildBannerTarget(linkType, linkValue)
      };
    })
    .filter(Boolean);
}

export function serializeBannerEntries(entries) {
  return entries
    .map(({ url, rawTarget, targetStr }) => {
      const target = rawTarget ?? targetStr ?? '';
      return target ? `${url}|${target}` : url;
    })
    .join(BANNER_ENTRY_SEP);
}

/** Resolve category id from admin DB row → product.category string used in storefront */
export function resolveCategoryLinkValue(categories, value) {
  if (!value) return '';
  const match = (categories || []).find(
    (c) => String(c.id) === String(value) || String(c.name) === String(value)
  );
  return match?.name || value;
}

export function getCategoryOptionValue(category) {
  return category?.name || String(category?.id || '');
}

export function migrateBannerLinkTargets(raw, categories) {
  if (!raw || !categories?.length) return { raw, changed: false };

  let changed = false;
  const migrated = parseBannerEntries(raw).map((entry) => {
    if (entry.linkType !== 'cat' || !entry.targetId) {
      return { url: entry.url, rawTarget: entry.rawTarget ?? entry.targetStr ?? '' };
    }

    const resolved = resolveCategoryLinkValue(categories, entry.targetId);
    if (resolved === entry.targetId) {
      return { url: entry.url, rawTarget: entry.rawTarget ?? entry.targetStr ?? '' };
    }

    changed = true;
    return { url: entry.url, rawTarget: buildBannerTarget('cat', resolved) };
  });

  return {
    raw: changed ? serializeBannerEntries(migrated) : raw,
    changed
  };
}
