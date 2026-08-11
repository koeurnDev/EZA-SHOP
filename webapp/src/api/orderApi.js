import apiRequest from './index';

export const createOrder = (orderData) => {
  return apiRequest('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
};

export const fetchOrderStatus = (orderCode) => {
  return apiRequest(`/api/orders/status/${orderCode}`);
};

// 🛡️ No userId param — backend resolves user identity from X-TG-Data auth header (prevents IDOR)
export const fetchUserOrders = (limit = 20, offset = 0) => {
  return apiRequest(`/api/user/orders?limit=${limit}&offset=${offset}`);
};

export const submitReview = (reviewData) => {
  return apiRequest('/api/orders/review', {
    method: 'POST',
    body: JSON.stringify(reviewData)
  });
};
