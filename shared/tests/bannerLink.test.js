import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBannerEntries,
  serializeBannerEntries,
  parseBannerTarget,
  buildBannerTarget,
  resolveCategoryLinkValue
} from '../bannerLinkUtils.js';

describe('bannerLinkUtils', () => {
  it('parses product link', () => {
    const [entry] = parseBannerEntries('https://cdn.example.com/a.jpg|prod:42');
    assert.equal(entry.linkType, 'prod');
    assert.equal(entry.targetId, '42');
  });

  it('parses category by name not numeric id', () => {
    const name = '👗 សម្លៀកបំពាក់ (Clothes)';
    const [entry] = parseBannerEntries(`https://cdn.example.com/a.jpg|cat:${name}`);
    assert.equal(entry.linkType, 'cat');
    assert.equal(entry.targetId, name);
  });

  it('serializes with banner separator', () => {
    const raw = serializeBannerEntries([
      { url: 'https://a.com/1.jpg', rawTarget: 'prod:1' },
      { url: 'https://a.com/2.jpg', rawTarget: '' }
    ]);
    assert.match(raw, /\|\|\|/);
    assert.equal(parseBannerEntries(raw).length, 2);
  });

  it('maps legacy category id to name for admin UI', () => {
    const categories = [{ id: 3, name: 'Beauty' }];
    assert.equal(resolveCategoryLinkValue(categories, '3'), 'Beauty');
  });

  it('builds external link target', () => {
    assert.equal(buildBannerTarget('ext', 'https://shop.com'), 'ext:https://shop.com');
    assert.equal(parseBannerTarget('ext:https://shop.com').linkValue, 'https://shop.com');
  });
});
