import { useEffect } from 'react';
import { parseProductStartParam } from '../utils/shareUtils';

export function useDeepLink(isSettingsLoaded, products, tg, setSelectedProduct, setView) {
  useEffect(() => {
    if (!isSettingsLoaded || !products?.length || !tg) return;
    const startParam = tg.initDataUnsafe?.start_param;
    const productId = parseProductStartParam(startParam);
    if (!productId) return;

    const product = products.find(p => String(p.id) === String(productId));
    if (product) {
      setSelectedProduct(product);
      setView('product_detail');
    }
  }, [isSettingsLoaded, products, tg, setSelectedProduct, setView]);
}
