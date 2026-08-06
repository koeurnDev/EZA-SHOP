import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AdminSkeleton from './AdminSkeleton';
import { useTelegram } from '../context/TelegramContext';
import { useUser } from '../context/UserContext';
import { useQuery } from '../hooks/useQuery';
import { useApi } from '../hooks/useApi';
import ProductDetail from './ProductDetail';
import { compressImage } from '../utils/imageUtils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/admin-dashboard.css';

// 🗂️ Modular tab sub-components (Senior Review Fix: split monolithic component)
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminOrdersTab from './admin/AdminOrdersTab';
import AdminProductsTab from './admin/AdminProductsTab';
import AdminBroadcastTab from './admin/AdminBroadcastTab';
import AdminFaqsTab from './admin/AdminFaqsTab';
import AdminSettingsTab from './admin/AdminSettingsTab';
import DarkSelect from './admin/DarkSelect';

// 🗂️ Modular modals
import AdminEditProductModal from './admin/modals/AdminEditProductModal';
import AdminAddProductModal from './admin/modals/AdminAddProductModal';
import AdminFaqModal from './admin/modals/AdminFaqModal';

const AdminDashboard = ({
  BACKEND_URL,
  setView,
  setPromoBannerUrl: setGlobalPromoBannerUrl,
  setPromoText: setGlobalPromoText,
  setShopStatus: setGlobalShopStatus,
  setDeliveryFee: setGlobalDeliveryFee,
  setDeliveryThreshold: setGlobalDeliveryThreshold,
  setShopLogoUrl: setGlobalShopLogoUrl,
  theme
}) => {
  const { tg, initData, showAlert: tgShowAlert } = useTelegram();
  const { t } = useUser();
  const { fetchWithRetry } = useApi();
  const headers = useMemo(() => ({ 'X-TG-Data': initData || '' }), [initData]);


  const [activeTab, setActiveTab] = useState('overview');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [localProductSearchTerm, setLocalProductSearchTerm] = useState('');
  const [visibleProductLimit, setVisibleProductLimit] = useState(30);
  const [orderFilter, setOrderFilter] = useState('all');
  const [trackingNumbers, setTrackingNumbers] = useState({});
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // 🛰️ BATCHED Data Fetching: Reduces 6 parallel connections to 1
  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard
  } = useQuery('admin-dashboard', `${BACKEND_URL}/api/admin/dashboard`, { headers });

  // Derived state from consolidated query
  const { data: advancedAnalyticsData } = useQuery('admin-advanced-analytics', `${BACKEND_URL}/api/admin/advanced-analytics`, { headers });
  const advancedAnalytics = advancedAnalyticsData?.data || { topProducts: [], topCustomers: [], aov: { aov: 0, aov_30d: 0 } };

  const summary = dashboardData?.summary || { totalRevenue: 0, totalOrders: 0, activeOrders: 0, totalCustomers: 0, businessHealth: 100 };
  const orders = dashboardData?.orders || [];
  const analytics = dashboardData ? { daily: dashboardData.analytics?.daily || [], status: dashboardData.analytics?.status || [] } : { daily: [], status: [] };
  const paddedDailyAnalytics = useMemo(() => {
    const daily = analytics.daily || [];
    const dataMap = new Map(daily.map(d => [d.date.slice(0, 10), d]));
    const padded = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortDate = `${dateStr.slice(8, 10)}-${dateStr.slice(5, 7)}`;
      if (dataMap.has(dateStr)) {
        padded.push({ ...dataMap.get(dateStr), dateShort: shortDate, revenue: parseFloat(dataMap.get(dateStr).revenue), orders: parseInt(dataMap.get(dateStr).orders) });
      } else {
        padded.push({ date: dateStr, dateShort: shortDate, revenue: 0, orders: 0 });
      }
    }
    return padded;
  }, [analytics.daily]);
  const products = dashboardData?.products || [];
  const categories = dashboardData?.categories || [];
  const settingsData = dashboardData; // Alias for settings logic compatibility


  // Settings specific state
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [receiptShopName, setReceiptShopName] = useState('MO-MO Boutique');
  const [receiptSubtitle, setReceiptSubtitle] = useState('អីវ៉ាន់បោះដុំ និងរាយ');
  const [receiptNote, setReceiptNote] = useState('សូមអរគុណសម្រាប់ការគាំទ្រ!');

  // Debounce search terms for performance
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(localSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setProductSearchTerm(localProductSearchTerm), 300);
    return () => clearTimeout(timer);
  }, [localProductSearchTerm]);

  useEffect(() => {
    if (settingsData?.success) {
      const s = settingsData.settings;
      setShopStatus(s.shop_status || 'open');
      setDeliveryThreshold(s.delivery_threshold || '50');
      setDeliveryFee(s.delivery_fee || '1.50');
      setPromoText(s.promo_text || '');
      setPromoBannerUrl(s.promo_banner_url || '');
      setShopLogoUrl(s.shop_logo_url || '');
      setPaymentQrUrl(s.payment_qr_url || '');
      setPaymentInfo(s.payment_info || '');
      setReceiptShopName(s.receipt_shop_name || 'MO-MO Boutique');
      setReceiptSubtitle(s.receipt_subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ');
      setReceiptNote(s.receipt_note || 'សូមអរគុណសម្រាប់ការគាំទ្រ!');
    }
  }, [settingsData]);

  const loading = dashboardLoading;


  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');

  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', stock: '' });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)',
    image: '', description: '', additional_images: [], flash_sale_price: '', flash_sale_end: '', video_url: ''
  });

  const [confirmDialog, setConfirmDialog] = useState(null); // Now used for BeautyModal
  const [printingOrder, setPrintingOrder] = useState(null);
  const [previewFavorited, setPreviewFavorited] = useState(false);

  // FAQ State
  const { data: faqsData, loading: faqsLoading, refetch: refetchFaqs } = useQuery('admin-faqs', `${BACKEND_URL}/api/admin/faqs`, { headers });
  const faqsList = faqsData?.faqs || [];
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const handleSaveFaq = async () => {
    try {
      const isEdit = !!editingFaq.id;
      const url = isEdit ? `${BACKEND_URL}/api/admin/faqs/${editingFaq.id}` : `${BACKEND_URL}/api/admin/faqs`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(editingFaq)
      });

      if (res.success) {
        setIsFaqModalOpen(false);
        refetchFaqs();
        setToastMessage('រក្សាទុក FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } catch (err) {
      alert('បរាជ័យក្នុងការរក្សាទុក FAQ: ' + err.message);
    }
  };

  const handleDeleteFaq = (id) => {
    showConfirm('តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?', () => {
      fetchWithRetry(`${BACKEND_URL}/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers
      }).then(() => {
        refetchFaqs();
        setToastMessage('លុប FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      });
    }, '🗑️');
  };

  const refetchData = useCallback((isBackground = false) => {
    refetchDashboard();
  }, [refetchDashboard]);

  // 🔒 Senior Review Fix: use stable ref to avoid interval reset on refetchData identity change
  const refetchDataRef = useRef(refetchData);
  useEffect(() => { refetchDataRef.current = refetchData; }, [refetchData]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetchDataRef.current(true);
      }
    }, 300000);
    return () => clearInterval(interval);
  }, []); // ✅ Empty deps — interval never resets

  const updateStatus = async (orderId, status) => {
    const trackingNumber = trackingNumbers[orderId] || '';

    fetchWithRetry(`${BACKEND_URL}/api/admin/orders/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ orderId, status, trackingNumber })
    }).then((res) => {
      if (res && !res.success) {
        return showAlert('បរាជ័យ: ' + (res.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
      setToastMessage('បច្ចុប្បន្នភាពជោគជ័យ!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('success');

      setTrackingNumbers(prev => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      refetchData(true);
    }).catch(err => {
      showAlert('បរាជ័យ: ' + err.message);
    });
  };

  const showAlert = (msg) => {
    setConfirmDialog({
      text: msg,
      onConfirm: () => setConfirmDialog(null),
      isAlert: true,
      icon: '✨'
    });
  };

  const showConfirm = (msg, onConfirm, icon = '❓') => {
    setConfirmDialog({
      text: msg,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
      isAlert: false,
      icon
    });
  };

  const submitAddProduct = async () => {
    if (!newProductData.name || !newProductData.price) return showAlert('សូមបំពេញឈ្មោះ និងតម្លៃ!');
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...newProductData,
          price: parseFloat(newProductData.price),
          stock: parseInt(newProductData.stock) || 0,
          additional_images: JSON.stringify(newProductData.additional_images || []),
          flash_sale_price: newProductData.flash_sale_price ? parseFloat(newProductData.flash_sale_price) : null,
          flash_sale_end: newProductData.flash_sale_end || null,
          video_url: newProductData.video_url || null
        })
      });
      if (res.success) {
        setIsAddingProduct(false);
        setNewProductData({ name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)', image: '', description: '', additional_images: [] });
        refetchData(true);
        setToastMessage('បន្ថែមទំនិញបានជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } finally { setIsSaving(false); }
  };

  const submitEditProduct = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...editingProduct,
          ...editFormData,
          price: parseFloat(editFormData.price),
          stock: parseInt(editFormData.stock),
          additional_images: JSON.stringify(editFormData.additional_images || []),
          flash_sale_price: editFormData.flash_sale_price ? parseFloat(editFormData.flash_sale_price) : null,
          flash_sale_end: editFormData.flash_sale_end || null,
          video_url: editFormData.video_url || null
        })
      });
      if (res.success) {
        setEditingProduct(null);
        refetchData(true);
        setToastMessage('កែប្រែទំនិញជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      }
    } catch (err) { showAlert('Error: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleBroadcastUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success) setBroadcastImage(res.data?.url);
    } finally { }
  };

  const handlePreview = (data) => {
    // Transform form data into product object structure for ProductDetail component
    const mockProduct = {
      ...data,
      id: 9999,
      price: parseFloat(data.price) || 0,
      stock: parseInt(data.stock) || 0,
    };
    setPreviewData(mockProduct);
    setIsPreviewing(true);
  };
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ message: broadcastMsg, photoUrl: broadcastImage })
      });
      if (res.success) {
        setToastMessage(`📢 បានផ្ញើដំណឹងដល់អតិថិជន ${res.data?.count || 0} នាក់!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setBroadcastMsg('');
        setBroadcastImage('');
      }
    } finally { setIsBroadcasting(false); }
  };

  const updateSettingValue = async (key, value) => {
    fetchWithRetry(`${BACKEND_URL}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ key, value })
    }).then(data => {
      if (data.success) {
        setToastMessage('រក្សាទុកជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
        if (key === 'shop_status') setGlobalShopStatus(value);
        if (key === 'promo_text') setGlobalPromoText(value);
        if (key === 'delivery_fee') setGlobalDeliveryFee(value);
        if (key === 'delivery_threshold') setGlobalDeliveryThreshold(value);
        if (key === 'shop_logo_url') setGlobalShopLogoUrl(value);
        if (key === 'payment_qr_url') setPaymentQrUrl(value);
        if (key === 'payment_info') setPaymentInfo(value);
      }
    });
  };

  const handleBannerUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success && res.data?.url) {
        const currentBanners = promoBannerUrl ? promoBannerUrl.split(',').map(u => u.trim()).filter(Boolean) : [];
        currentBanners.push(res.data.url);
        const newBanners = currentBanners.join(',');
        await updateSettingValue('promo_banner_url', newBanners);
        setPromoBannerUrl(newBanners);
        setGlobalPromoBannerUrl(newBanners);
      }
    } finally { }
  };

  const removeBanner = async (indexToRemove) => {
    const currentBanners = promoBannerUrl ? promoBannerUrl.split(',').map(u => u.trim()).filter(Boolean) : [];
    currentBanners.splice(indexToRemove, 1);
    const newBanners = currentBanners.join(',');
    await updateSettingValue('promo_banner_url', newBanners);
    setPromoBannerUrl(newBanners);
    setGlobalPromoBannerUrl(newBanners);
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    setIsUploading(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: formData });
      if (res.success && res.data?.url) {
        await updateSettingValue('shop_logo_url', res.data.url);
        setShopLogoUrl(res.data.url);
        setGlobalShopLogoUrl(res.data.url);
      }
    } finally {
      setIsUploading(false);
    }
  };
  const handleQrUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    setIsUploading(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers, body: formData });
      if (res.success && res.data?.url) {
        await updateSettingValue('payment_qr_url', res.data.url);
        setPaymentQrUrl(res.data.url);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const statusTags = {
    'pending': { label: 'រង់ចាំបង់', color: 'var(--text-main)', icon: '⏳' },
    'paid': { label: 'បង់រួច', color: 'var(--text-main)', icon: '✅' },
    'processing': { label: 'រៀបចំអីវ៉ាន់', color: 'var(--text-main)', icon: '📦' },
    'shipped': { label: 'អីវ៉ាន់បានចេញ', color: 'var(--text-main)', icon: '✨' },
    'delivering': { label: 'ប្រគល់ឱ្យដឹកជញ្ជូន', color: 'var(--text-main)', icon: '🚚' },
    'delivered': { label: 'បានដល់ដៃ', color: 'var(--text-main)', icon: '🏠' }
  };

  return (
    <>
      {printingOrder && <PrintableOrder order={printingOrder} shopName={receiptShopName} subtitle={receiptSubtitle} shopNote={receiptNote} />}
      <div className="admin-dashboard-overhaul animate-in no-print" style={{ paddingBottom: 100 }}>
        
        <div className="admin-header-luxury">
          <div>
            <h2 className="admin-title-pro">⚙️ {t('admin_title')}</h2>
            <div className="live-status-pill">
              <div className="live-dot-pulse"></div>
              <span style={{ fontSize: 9, fontWeight: 950, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: 1.2 }}>{t('admin_live_status')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => refetchData(false)} className="icon-btn-admin" aria-label="Refresh Data" title={t('admin_refresh')}>🔄</button>
            <button onClick={() => setView('home')} className="back-btn-pill">← {t('admin_logout')}</button>
          </div>
        </div>

        <div className="admin-nav-luxury-grid">
          {[
            { id: 'overview', label: `📊 ${t('admin_tab_overview')}` },
            { id: 'orders', label: `🎫 ${t('admin_tab_orders')}` },
            { id: 'products', label: `🛍️ ${t('admin_tab_products')}` },
            { id: 'broadcast', label: `📢 ${t('admin_tab_broadcast')}` },
            { id: 'faqs', label: `❓ ${t('admin_tab_faqs')}` },
            { id: 'settings', label: `⚙️ ${t('admin_tab_settings')}` }
          ].map(tab => (
            <button key={tab.id} className={`nav-pill-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

                <div style={{ padding: '0 15px' }}>
          {activeTab === 'overview' && (
            <AdminOverviewTab
              summary={summary}
              paddedDailyAnalytics={paddedDailyAnalytics}
              advancedAnalytics={advancedAnalytics}
              orders={orders}
              statusTags={statusTags}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              searchTerm={searchTerm}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              localSearchTerm={localSearchTerm}
              setLocalSearchTerm={setLocalSearchTerm}
              updateStatus={updateStatus}
              setPrintingOrder={setPrintingOrder}
              statusTags={statusTags}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsTab
              products={products}
              productSearchTerm={productSearchTerm}
              localProductSearchTerm={localProductSearchTerm}
              setLocalProductSearchTerm={setLocalProductSearchTerm}
              setIsAddingProduct={setIsAddingProduct}
              setEditingProduct={setEditingProduct}
              setEditFormData={setEditFormData}
              visibleProductLimit={visibleProductLimit}
              setVisibleProductLimit={setVisibleProductLimit}
            />
          )}

          {activeTab === 'broadcast' && (
            <AdminBroadcastTab
              broadcastImage={broadcastImage}
              broadcastMsg={broadcastMsg}
              setBroadcastMsg={setBroadcastMsg}
              isBroadcasting={isBroadcasting}
              handleBroadcast={handleBroadcast}
              handleBroadcastUpload={handleBroadcastUpload}
            />
          )}

          {activeTab === 'faqs' && (
            <AdminFaqsTab
              faqsLoading={faqsLoading}
              faqsList={faqsList}
              setEditingFaq={setEditingFaq}
              setIsFaqModalOpen={setIsFaqModalOpen}
              handleDeleteFaq={handleDeleteFaq}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsTab
              shopStatus={shopStatus}
              showConfirm={showConfirm}
              setShopStatus={setShopStatus}
              updateSettingValue={updateSettingValue}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              deliveryThreshold={deliveryThreshold}
              setDeliveryThreshold={setDeliveryThreshold}
              promoBannerUrl={promoBannerUrl}
              removeBanner={removeBanner}
              handleBannerUpload={handleBannerUpload}
              shopLogoUrl={shopLogoUrl}
              handleLogoUpload={handleLogoUpload}
              paymentQrUrl={paymentQrUrl}
              handleQrUpload={handleQrUpload}
              paymentInfo={paymentInfo}
              setPaymentInfo={setPaymentInfo}
              receiptShopName={receiptShopName}
              setReceiptShopName={setReceiptShopName}
              receiptSubtitle={receiptSubtitle}
              setReceiptSubtitle={setReceiptSubtitle}
              receiptNote={receiptNote}
              setReceiptNote={setReceiptNote}
            />
          )}

        </div>

        {showSuccessToast && (
          <div className="admin-toast-float">
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

            {/* ✅ Modals rendered OUTSIDE the animate-in container so position:fixed works correctly */}
      <AdminEditProductModal
        editingProduct={editingProduct}
        isUploading={isUploading}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        compressImage={compressImage}
        setIsUploading={setIsUploading}
        fetchWithRetry={fetchWithRetry}
        BACKEND_URL={BACKEND_URL}
        headers={headers}
        categories={categories}
        setEditingProduct={setEditingProduct}
        handlePreview={handlePreview}
        isSaving={isSaving}
        submitEditProduct={submitEditProduct}
      />

      <AdminAddProductModal
        isAddingProduct={isAddingProduct}
        isUploading={isUploading}
        newProductData={newProductData}
        setNewProductData={setNewProductData}
        compressImage={compressImage}
        setIsUploading={setIsUploading}
        fetchWithRetry={fetchWithRetry}
        BACKEND_URL={BACKEND_URL}
        headers={headers}
        categories={categories}
        setIsAddingProduct={setIsAddingProduct}
        handlePreview={handlePreview}
        isSaving={isSaving}
        submitAddProduct={submitAddProduct}
      />

      <AdminFaqModal
        isFaqModalOpen={isFaqModalOpen}
        editingFaq={editingFaq}
        setEditingFaq={setEditingFaq}
        setIsFaqModalOpen={setIsFaqModalOpen}
        handleSaveFaq={handleSaveFaq}
      />

      {isPreviewing && previewData && (
        <ProductDetail
          product={previewData}
          onClose={() => setIsPreviewing(false)}
          onAdd={() => showAlert('នេះគ្រាន់តែជារូបភាព Preview!')}
          lang={tg?.language_code === 'kh' ? 'kh' : 'en'}
          isFavorited={previewFavorited}
          onToggleWishlist={() => setPreviewFavorited(!previewFavorited)}
        />
      )}

      {confirmDialog && (
        <BeautyModal
          text={confirmDialog.text}
          icon={confirmDialog.icon}
          isAlert={confirmDialog.isAlert}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
};

const BeautyModal = ({ text, icon, isAlert, onConfirm, onCancel }) => (
  <div className="admin-dashboard-overhaul modal-overlay">
    <div className="beauty-modal-card">
      <div style={{ fontSize: 50, marginBottom: 20 }}>{icon || '✨'}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 30, lineHeight: 1.6, color: 'var(--text-luxury)' }}>{text}</div>
      <div style={{ display: 'flex', gap: 12 }}>
        {!isAlert && (
          <button className="nav-pill-btn" style={{ flex: 1, minHeight: 50 }} onClick={onCancel}>បោះបង់</button>
        )}
        <button className="ticket-btn-primary" style={{ flex: 1.5, minHeight: 50 }} onClick={onConfirm}>
          {isAlert ? 'យល់ព្រម' : 'បន្ត'}
        </button>
      </div>
    </div>
  </div>
);

const PrintableOrder = ({ order, shopName, subtitle, shopNote }) => {
  if (!order) return null;
  const items = JSON.parse(order.items || '[]');
  return (
    <div className="printable-order">
      <div className="print-header">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>{shopName || 'MO-MO Boutique'}</h2>
        <p style={{ margin: '5px 0', fontSize: 14 }}>{subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ'}</p>
      </div>
      <div className="print-divider"></div>
      <div className="print-section">
        <div className="print-row"><span>លេខវិក្កយបត្រ:</span> <strong>{order.order_code || `#MO-${order.id}`}</strong></div>
        <div className="print-row"><span>អតិថិជន:</span> <strong>{order.user_name}</strong></div>
        <div className="print-row"><span>លេខទូរស័ព្ទ:</span> <strong>{order.phone}</strong></div>
        {order.address && <div className="print-row"><span>ទីតាំង:</span> <strong>{order.address}{order.province ? `, ${order.province}` : ''}</strong></div>}
        {order.delivery_company && <div className="print-row"><span>ក្រុមហ៊ុនដឹក:</span> <strong style={{ textTransform: 'uppercase' }}>{order.delivery_company}</strong></div>}
        {order.note && <div className="print-row"><span>ចំណាំ:</span> <strong>{order.note}</strong></div>}
      </div>
      <div className="print-divider"></div>
      <table className="print-table">
        <thead><tr><th align="left">ឈ្មោះទំនិញ</th><th align="center">ចំនួន</th><th align="right">តម្លៃ</th></tr></thead>
        <tbody>{items.map((item, i) => (<tr key={i}><td style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.name}</td><td align="center">x{item.quantity}</td><td align="right">${(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody>
      </table>
      <div className="print-divider"></div>
      <div className="print-total"><span>សរុបរួម:</span> <span style={{ fontSize: 20, fontWeight: 950 }}>${parseFloat(order.total).toFixed(2)}</span></div>
      {shopNote && (
        <>
          <div className="print-divider" style={{ borderStyle: 'dashed', marginTop: 15 }}></div>
          <div style={{ textAlign: 'center', fontSize: 12, marginTop: 15, fontWeight: 800, opacity: 0.8, whiteSpace: 'pre-line' }}>
            {shopNote}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
