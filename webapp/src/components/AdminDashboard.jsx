import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AdminSkeleton from './AdminSkeleton';
import { useTelegram } from '../context/TelegramContext';
import { useUser } from '../context/UserContext';
import { useQuery } from '../hooks/useQuery';
import { useApi } from '../hooks/useApi';
import useScrollHideBar from '../hooks/useScrollHideBar';
import { useShopDispatch } from '../context/ShopContext';
import ProductDetail from './ProductDetail';
import { compressImage } from '../utils/imageUtils';
import {
  parseBannerEntries,
  serializeBannerEntries,
  migrateBannerLinkTargets
} from '../utils/bannerLinkUtils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/admin-dashboard.css';

// 🗂️ Modular tab sub-components (Senior Review Fix: split monolithic component)
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminOrdersTab from './admin/AdminOrdersTab';
import AdminProductsContainer from './admin/AdminProductsContainer';
import AdminBroadcastContainer from './admin/AdminBroadcastContainer';
import AdminFaqsContainer from './admin/AdminFaqsContainer';
import AdminSettingsContainer from './admin/AdminSettingsContainer';
import AdminCustomersTab from './admin/AdminCustomersTab';
import AdminCouponsTab from './admin/AdminCouponsTab';
import DarkSelect from './admin/DarkSelect';

// 🗂️ Modular modals
import AdminEditProductModal from './admin/modals/AdminEditProductModal';
import InvoiceModal from './InvoiceModal';
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
  const { t, lang } = useUser();
  const { fetchWithRetry } = useApi();
  const { refetchData: refetchShopData, mutateShopData } = useShopDispatch();
  const headers = useMemo(() => ({ 'X-TG-Data': initData || '', 'X-Debug-Bypass': 'true' }), [initData]);
  const chromeVisible = useScrollHideBar();


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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🛰️ BATCHED Data Fetching: Reduces 6 parallel connections to 1
  const {
    data: dashboardData,
    loading: dashboardLoading,
    refetch: refetchDashboard,
    mutate: mutateDashboard
  } = useQuery('admin-dashboard', `${BACKEND_URL}/api/admin/dashboard`, { headers, revalidateOnMount: true });

  const userRole = dashboardData?.userRole || (dashboardLoading ? 'admin' : 'staff');

  useEffect(() => {
    if (userRole === 'staff' && activeTab === 'overview') {
      setActiveTab('orders');
    }
  }, [userRole, activeTab]);

  // Derived state from consolidated query
  const { data: advancedAnalyticsData } = useQuery('admin-advanced-analytics', `${BACKEND_URL}/api/admin/advanced-analytics`, { headers, revalidateOnMount: true });
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


  const loading = dashboardLoading;


  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [previewFavorited, setPreviewFavorited] = useState(false);



  const refetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDashboard(isBackground),
        refetchShopData(isBackground)
      ]);
      if (!isBackground) {
        setToastMessage(lang === 'kh' ? 'ធ្វើបច្ចុប្បន្នភាពរួចហើយ' : 'Data refreshed');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 1800);
      }
    } finally {
      if (!isBackground) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, [refetchDashboard, refetchShopData, lang]);

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

  const updatingStatusRef = useRef(new Set());

  const updateStatus = async (orderId, status) => {
    const normalizedId = String(orderId);
    if (updatingStatusRef.current.has(normalizedId)) return;
    updatingStatusRef.current.add(normalizedId);

    const trackingNumber = trackingNumbers[orderId] ?? trackingNumbers[normalizedId] ?? '';

    const applyOrderPatch = (patch) => {
      mutateDashboard(prev => {
        if (!prev?.orders) return prev;
        return {
          ...prev,
          orders: prev.orders.map(o => (
            String(o.id) === normalizedId || String(o.order_code || '') === normalizedId
              ? { ...o, ...patch }
              : o
          ))
        };
      });
    };

    // Optimistic UI update
    applyOrderPatch({ status });

    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/orders/${normalizedId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status, tracking_number: trackingNumber })
      });

      if (!res?.success) {
        refetchData(true);
        showAlert('បរាជ័យ: ' + (res?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return;
      }

      const payload = res.data;
      if (!payload?.success) {
        refetchData(true);
        showAlert('បរាជ័យ: ' + (payload?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return;
      }

      if (payload.order) {
        applyOrderPatch(payload.order);
      }

      setToastMessage('បច្ចុប្បន្នភាពជោគជ័យ!');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2500);

      if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

      setTrackingNumbers(prev => {
        const next = { ...prev };
        delete next[orderId];
        delete next[normalizedId];
        return next;
      });
    } catch (err) {
      refetchData(true);
      showAlert('បរាជ័យ: ' + err.message);
    } finally {
      updatingStatusRef.current.delete(normalizedId);
    }
  };

  const showAlert = (msg) => {
    // tg.showAlert requires v6.2+, use in-app dialog always for compatibility
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
  const statusTags = {
    'pending': { label: 'រង់ចាំការបញ្ជាក់', color: 'var(--text-main)', icon: '⏳' },
    'paid': { label: 'កំពុងរៀបចំ', color: 'var(--text-main)', icon: '📦' },
    'processing': { label: 'កំពុងរៀបចំ', color: 'var(--text-main)', icon: '📦' },
    'shipped': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'delivering': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'delivered': { label: 'ប្រគល់ជូនអ្នកដឹក', color: 'var(--text-main)', icon: '🚚' },
    'completed': { label: 'ទទួលបានជោគជ័យ', color: '#16a34a', icon: '✅' },
    'cancelled': { label: 'បដិសេធ', color: '#dc2626', icon: '❌' }
  };

  return (
    <>
      {printingOrder && <InvoiceModal 
        order={printingOrder} 
        onClose={() => setPrintingOrder(null)} 
        paymentQrUrl={null} 
        paymentInfo={''} 
        BACKEND_URL={BACKEND_URL} 
        onPaymentSuccess={() => {}} 
        t={t} 
        lang={tg?.language_code === 'en' ? 'en' : 'kh'} 
      />}
      <div className="admin-dashboard-overhaul animate-in no-print">
        <div className={`admin-sticky-chrome${chromeVisible ? '' : ' admin-sticky-chrome--hidden'}`}>
          <div className="admin-header-luxury">
            <div className="admin-header-brand">
              <span className="admin-header-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </span>
              <h2 className="admin-title-pro">
                <span className="admin-title-kh">{lang === 'kh' ? 'គ្រប់គ្រង Vibe Lifestyle' : 'Manage Vibe Lifestyle'}</span>
              </h2>
            </div>
            <div className="admin-header-actions">
              <button
                type="button"
                onClick={() => refetchData(false)}
                className={`admin-header-icon-btn${isRefreshing ? ' admin-header-icon-btn--spin' : ''}`}
                aria-label={t('admin_refresh')}
                title={t('admin_refresh')}
                disabled={isRefreshing}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button type="button" onClick={() => setView('home')} className="back-btn-pill admin-header-exit-btn">← {t('admin_logout')}</button>
            </div>
          </div>

          <div className="admin-nav-luxury-grid">
            {[
              ...(userRole === 'admin' ? [{ id: 'overview', label: t('admin_tab_overview') }] : []),
              { id: 'orders', label: t('admin_tab_orders') },
              { id: 'products', label: t('admin_tab_products') },
              { id: 'broadcast', label: t('admin_tab_broadcast') },
              { id: 'faqs', label: t('admin_tab_faqs') },
              ...(userRole === 'admin' ? [
                { id: 'customers', label: t('admin_tab_customers') },
                { id: 'coupons', label: t('admin_tab_coupons') },
                { id: 'settings', label: t('admin_tab_settings') }
              ] : [])
            ].map(tab => (
              <button key={tab.id} className={`nav-pill-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-tab-content">
          {activeTab === 'overview' && (
            <AdminOverviewTab
              BACKEND_URL={BACKEND_URL}
              summary={summary}
              paddedDailyAnalytics={paddedDailyAnalytics}
              advancedAnalytics={advancedAnalytics}
              orders={orders}
              statusTags={statusTags}
            />
          )}

          {activeTab === 'customers' && (
            <AdminCustomersTab BACKEND_URL={BACKEND_URL} />
          )}

          {activeTab === 'coupons' && (
            <AdminCouponsTab BACKEND_URL={BACKEND_URL} />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              products={products}
              searchTerm={searchTerm}
              orderFilter={orderFilter}
              setOrderFilter={setOrderFilter}
              localSearchTerm={localSearchTerm}
              setLocalSearchTerm={setLocalSearchTerm}
              updateStatus={updateStatus}
              setPrintingOrder={setPrintingOrder}
              statusTags={statusTags}
              trackingNumbers={trackingNumbers}
              setTrackingNumbers={setTrackingNumbers}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsContainer
              BACKEND_URL={BACKEND_URL}
              headers={headers}
              products={products}
              categories={categories}
              showConfirm={showConfirm}
              showAlert={showAlert}
              setToastMessage={setToastMessage}
              setShowSuccessToast={setShowSuccessToast}
              refetchData={refetchData}
              mutateDashboard={mutateDashboard}
              productSearchTerm={productSearchTerm}
              localProductSearchTerm={localProductSearchTerm}
              setLocalProductSearchTerm={setLocalProductSearchTerm}
              visibleProductLimit={visibleProductLimit}
              setVisibleProductLimit={setVisibleProductLimit}
            />
          )}

          {activeTab === 'broadcast' && (
            <AdminBroadcastContainer
              BACKEND_URL={BACKEND_URL}
              headers={headers}
              setToastMessage={setToastMessage}
              setShowSuccessToast={setShowSuccessToast}
            />
          )}

          {activeTab === 'faqs' && (
            <AdminFaqsContainer
              BACKEND_URL={BACKEND_URL}
              headers={headers}
              showConfirm={showConfirm}
              setToastMessage={setToastMessage}
              setShowSuccessToast={setShowSuccessToast}
              refetchData={refetchData}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsContainer
              BACKEND_URL={BACKEND_URL}
              headers={headers}
              settingsData={{ success: true, settings: dashboardData?.settings || {} }}
              products={products}
              categories={categories}
              showConfirm={showConfirm}
              showAlert={showAlert}
              setToastMessage={setToastMessage}
              setShowSuccessToast={setShowSuccessToast}
              setGlobalShopStatus={setGlobalShopStatus}
              setGlobalPromoText={setGlobalPromoText}
              setGlobalPromoBannerUrl={setGlobalPromoBannerUrl}
              setGlobalDeliveryFee={setGlobalDeliveryFee}
              setGlobalDeliveryThreshold={setGlobalDeliveryThreshold}
              setGlobalShopLogoUrl={setGlobalShopLogoUrl}
            />
          )}

        </div>

        {showSuccessToast && (
          <div className="admin-toast-float">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>


      {confirmDialog && (
        <BeautyModal
          text={confirmDialog.text}
          icon={confirmDialog.icon}
          isAlert={confirmDialog.isAlert}
          isDelete={confirmDialog.isDelete}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
};

const BeautyModal = ({ text, icon, isAlert, isDelete, confirmLabel, onConfirm, onCancel }) => {
  const isRed = isDelete || (!isAlert && !confirmLabel);
  return (
  <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)' }}>
    <div className="beauty-modal-card" style={{ background: 'var(--bg-surface, #1e1e24)', border: '1px solid var(--border-color, rgba(255,255,255,0.15))', padding: '30px 24px', borderRadius: 28 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon || (isAlert ? '✨' : '🗑️')}</div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 26, lineHeight: 1.6, color: 'var(--text-bold, #ffffff)' }}>{text}</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {!isAlert && (
          <button
            className="nav-pill-btn"
            style={{ flex: 1, minHeight: 46, borderRadius: 14, background: 'var(--bg-soft, rgba(255,255,255,0.1))', color: 'var(--text-bold, #ffffff)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
            onClick={onCancel}
          >
            បោះបង់
          </button>
        )}
        <button
          className="detail-btn-buy-luxury"
          style={{ flex: 1.2, minHeight: 46, borderRadius: 14, background: isRed ? '#ef4444' : 'var(--primary-accent, #10b981)', color: '#ffffff', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', boxShadow: isRed ? '0 4px 14px rgba(239,68,68,0.3)' : '0 4px 14px rgba(16,185,129,0.3)' }}
          onClick={onConfirm}
        >
          {confirmLabel || (isAlert ? 'យល់ព្រម' : isRed ? 'លុប' : 'យល់ព្រម')}
        </button>
      </div>
    </div>
  </div>
);};

const PrintableOrder = ({ order, shopName, subtitle, shopNote }) => {
  if (!order) return null;
  const items = JSON.parse(order.items || '[]');
  return (
    <div className="printable-order">
      <div className="print-header">
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 950 }}>{shopName || 'Vibe Lifestyle'}</h2>
        <p style={{ margin: '5px 0', fontSize: 14 }}>{subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ'}</p>
      </div>
      <div className="print-divider"></div>
      <div className="print-section">
        <div className="print-row"><span>លេខវិក្កយបត្រ:</span> <strong>{order.order_code || order.id}</strong></div>
        <div className="print-row"><span>អតិថិជន:</span> <strong>{order.user_name}</strong></div>
        <div className="print-row"><span>លេខទូរស័ព្ទ:</span> <strong>{order.phone}</strong></div>
        {order.address && <div className="print-row"><span>ទីតាំង:</span> <strong>{order.address}{order.province ? `, ${order.province}` : ''}</strong></div>}
        {order.delivery_company && <div className="print-row"><span>ក្រុមហ៊ុនដឹក:</span> <strong style={{ textTransform: 'uppercase' }}>{order.delivery_company}</strong></div>}
        {order.note && <div className="print-row"><span>ចំណាំ:</span> <strong>{order.note}</strong></div>}
      </div>
      <div className="print-divider"></div>
      <table className="print-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th align="left" style={{ width: '55%' }}>ឈ្មោះទំនិញ</th>
            <th align="center" style={{ width: '15%' }}>ចំនួន</th>
            <th align="right" style={{ width: '30%' }}>តម្លៃ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ fontSize: '11px', fontWeight: 'bold', wordWrap: 'break-word', whiteSpace: 'normal', paddingRight: '5px' }}>{item.name}</td>
              <td align="center">x{item.quantity}</td>
              <td align="right">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
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
