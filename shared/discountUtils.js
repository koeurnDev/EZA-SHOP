/**
 * Shared discount math — single source of truth for bot + webapp.
 */
export const toCents = (val) => Math.round(Number(val || 0) * 100);
export const fromCents = (cents) => Math.round(cents) / 100;

export function calculateBestDiscount(product, activeDiscounts = []) {
  if (!product || !activeDiscounts || !activeDiscounts.length) return null;

  const relevant = activeDiscounts.filter((d) =>
    String(d.apply_to) === 'all'
    || (d.product_ids && d.product_ids.map(String).includes(String(product.id)))
  );

  if (!relevant.length) return null;

  const priceCents = toCents(product.price);

  return relevant.sort((a, b) => {
    const valACents = a.discount_type === 'percent'
      ? Math.round(priceCents * (Number(a.value) / 100))
      : toCents(a.value);
    const valBCents = b.discount_type === 'percent'
      ? Math.round(priceCents * (Number(b.value) / 100))
      : toCents(b.value);
    return valBCents - valACents;
  })[0];
}

export function getDiscountedPrice(product, bestDiscount) {
  const priceCents = toCents(product?.price);
  if (!bestDiscount) return fromCents(priceCents);

  let discountCents = 0;
  if (bestDiscount.discount_type === 'percent') {
    discountCents = Math.round(priceCents * (Number(bestDiscount.value) / 100));
  } else {
    discountCents = toCents(bestDiscount.value);
  }

  return fromCents(Math.max(0, priceCents - discountCents));
}
