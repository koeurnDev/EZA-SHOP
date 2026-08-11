/**
 * Utility to calculate best discount for a product
 */
export const calculateBestDiscount = (product, activeDiscounts = []) => {
    if (!product || !activeDiscounts.length) return null;

    const relevant = activeDiscounts.filter(d => 
        d.apply_to === 'all' || (d.product_ids && d.product_ids.includes(product.id))
    );
    
    if (!relevant.length) return null;

    // Convert price to cents to prevent floating-point precision issues
    const priceCents = Math.round(product.price * 100);

    // Sort to find the best discount (highest value)
    return relevant.sort((a, b) => {
        const valA = a.discount_type === 'percent' ? Math.round(priceCents * a.value / 100) : Math.round(a.value * 100);
        const valB = b.discount_type === 'percent' ? Math.round(priceCents * b.value / 100) : Math.round(b.value * 100);
        return valB - valA;
    })[0];
};

export const getDiscountedPrice = (product, bestDiscount) => {
    if (!bestDiscount) return product.price;
    const priceCents = Math.round(product.price * 100);
    
    // Safer math: (priceCents * (100 - bestDiscount.value)) / 100
    const finalCents = bestDiscount.discount_type === 'percent' 
        ? Math.round((priceCents * (100 - bestDiscount.value)) / 100) 
        : Math.max(0, priceCents - Math.round(bestDiscount.value * 100));
        
    return finalCents / 100;
};
