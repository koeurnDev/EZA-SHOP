import { useState, useEffect } from 'react';
import OfflineService from '../services/OfflineService';

export function useCheckout({ 
  user, cart, clearCart, prepareIdempotency, idempotencyKey, 
  fetchWithRetry, showAlert, setView, tg, backendUrl, lang, HapticFeedback
}) {
  const [showInvoice, setShowInvoice] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('momo_shipping_info');
      return saved ? JSON.parse(saved) : {
        name: user?.first_name || '',
        phone: '',
        address: '',
        province: 'Phnom Penh',
        note: '',
        postToTelegram: false,
        deliveryCompany: 'J&T Express'
      };
    } catch (e) { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('momo_shipping_info', JSON.stringify(formData));
  }, [formData]);

  const handleCheckout = async (finalTotal, couponCode = null) => {
    if (cart.length === 0) return;
    
    const phoneClean = formData.phone.replace(/\s/g, '');
    if (phoneClean.length < 9 || !formData.address?.trim()) {
      setValidationErrors({ 
        phone: phoneClean.length < 9,
        address: !formData.address?.trim()
      });
      HapticFeedback?.notificationOccurred('error');
      setTimeout(() => setValidationErrors({}), 2000);
      return;
    }

    const currentKey = idempotencyKey || prepareIdempotency();

    const orderData = {
      userId: user?.id,
      userName: user?.first_name || 'Guest',
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      total: finalTotal,
      phone: formData.phone,
      address: formData.address,
      province: formData.province || 'Phnom Penh',
      note: formData.note || '',
      delivery_company: formData.deliveryCompany || formData.delivery_company || 'J&T Express',
      payment_method: 'Bakong KHQR',
      idempotencyKey: currentKey,
      coupon_code: couponCode || undefined,
    };

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-tg-data': tg?.initData || '' },
      body: JSON.stringify(orderData),
      idempotent: true
    };

    if (!navigator.onLine) {
      OfflineService.queueRequest(`${backendUrl}/api/orders`, requestOptions);
      showAlert(lang === 'kh' ? 'អ្នកមិនទាន់មានអ៊ីនធឺណិតទេ! ការកម្ម៉ង់ត្រូវបានរក្សាទុក ហើយនឹងផ្ញើទៅពេលអ្នកមានអ៊ីនធឺណិតវិញ។' : 'Offline! Your order is saved and will be sent automatically when you are back online.');
      clearCart();
      setView('home');
      return;
    }

    setIsPlacingOrder(true);
    
    const draftOrder = {
      id: 'DRAFT',
      order_code: '...',
      total: finalTotal,
      items: cart,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    setLastOrder(draftOrder);
    setShowInvoice(true);

    const result = await fetchWithRetry(`${backendUrl}/api/orders`, requestOptions);
    setIsPlacingOrder(false);
    
    if (result.success) {
      setLastOrder(result.order || (result.data && result.data.order));
      clearCart();
      return true;
    } else {
      setShowInvoice(false);
      showAlert(result.error || 'Order Failed');
      return false;
    }
  };

  const handleConfirmPayment = async (orderId) => {
    HapticFeedback?.impactOccurred('medium');
    const result = await fetchWithRetry(`${backendUrl}/api/orders/${orderId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-TG-Data': window.Telegram?.WebApp?.initData || '' }
    });
    
    if (result.success) {
      handlePaymentSuccess(HapticFeedback);
      return true;
    } else {
      showAlert(result.error || 'Confirmation Failed');
      return false;
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    HapticFeedback?.notificationOccurred('success');
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setView('home');
    }, 5000);
  };

  return {
    showInvoice, setShowInvoice,
    showConfetti, setShowConfetti,
    lastOrder, setLastOrder,
    isPlacingOrder,
    validationErrors,
    formData, setFormData,
    handleCheckout,
    handleConfirmPayment,
    handlePaymentSuccess
  };
}
