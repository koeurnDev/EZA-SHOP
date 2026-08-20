import React, { useState, useEffect } from 'react';
import AdminSettingsTab from './AdminSettingsTab';
import { useShopDispatch } from '../../context/ShopContext';
import { useApi } from '../../hooks/useApi';
import { useTelegram } from '../../context/TelegramContext';
import { parseBannerEntries, serializeBannerEntries } from '../../utils/bannerLinkUtils';

const AdminSettingsContainer = ({
  BACKEND_URL,
  headers,
  settingsData,
  products,
  categories,
  showConfirm,
  showAlert,
  setToastMessage,
  setShowSuccessToast,
  setGlobalShopStatus,
  setGlobalPromoText,
  setGlobalPromoBannerUrl,
  setGlobalDeliveryFee,
  setGlobalDeliveryThreshold,
  setGlobalShopLogoUrl
}) => {
  const { fetchWithRetry } = useApi();
  const { refetchData: refetchShopData, mutateShopData } = useShopDispatch();

  // Settings specific state
  const [shopStatus, setShopStatus] = useState('open');
  const [deliveryThreshold, setDeliveryThreshold] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('1.50');
  const [provincialDeliveryFee, setProvincialDeliveryFee] = useState('2.50');
  const [promoText, setPromoText] = useState('');
  const [promoBannerUrl, setPromoBannerUrl] = useState('');
  const [shopLogoUrl, setShopLogoUrl] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentInfo, setPaymentInfo] = useState('');
  const [receiptShopName, setReceiptShopName] = useState('Vibe Lifestyle');
  const [receiptSubtitle, setReceiptSubtitle] = useState('អីវ៉ាន់បោះដុំ និងរាយ');
  const [receiptNote, setReceiptNote] = useState('សូមអរគុណសម្រាប់ការគាំទ្រ!');
  const [socialFb, setSocialFb] = useState('');
  const [socialTg, setSocialTg] = useState('');
  const [socialIg, setSocialIg] = useState('');
  const [socialTt, setSocialTt] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialWa, setSocialWa] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopHours, setShopHours] = useState('');
  const [telegramChannelId, setTelegramChannelId] = useState('');
  const [shopHistoryKh, setShopHistoryKh] = useState('');
  const [shopHistoryEn, setShopHistoryEn] = useState('');

  // Single source of truth: always fetch fresh settings on mount.
  // Drops the settingsData prop effect to avoid stale-prop race condition.
  useEffect(() => {
    const tgData = window.Telegram?.WebApp?.initData || '';
    fetchWithRetry(`${BACKEND_URL}/api/settings`, {
      headers: { 'X-TG-Data': tgData }
    })
      .then(data => {
        if (data.success && data.settings) {
          const s = data.settings;
          setShopStatus(s.shop_status || 'open');
          setDeliveryThreshold(s.delivery_threshold !== undefined ? String(s.delivery_threshold) : '50');
          setDeliveryFee(s.delivery_fee !== undefined ? String(s.delivery_fee) : '1.50');
          setProvincialDeliveryFee(s.provincial_delivery_fee !== undefined ? String(s.provincial_delivery_fee) : '2.50');
          setPromoText(s.promo_text || '');
          setPromoBannerUrl(s.promo_banner_url || '');
          setShopLogoUrl(s.shop_logo_url || '');
          setPaymentQrUrl(s.payment_qr_url || '');
          setPaymentInfo(s.payment_info || '');
          setReceiptShopName(s.receipt_shop_name || 'Vibe Lifestyle');
          setReceiptSubtitle(s.receipt_subtitle || 'អីវ៉ាន់បោះដុំ និងរាយ');
          setReceiptNote(s.receipt_note || 'សូមអរគុណសម្រាប់ការគាំទ្រ!');
          setSocialFb(s.social_fb || '');
          setSocialTg(s.social_tg || '');
          setSocialIg(s.social_ig || '');
          setSocialTt(s.social_tt || '');
          setSocialEmail(s.social_email || '');
          setSocialWa(s.social_wa || '');
          setShopPhone(s.shop_phone || '');
          setShopAddress(s.shop_address || '');
          setShopHours(s.shop_hours || '');
          setTelegramChannelId(s.telegram_channel_id || '');
          setShopHistoryKh(s.shop_history_kh || '');
          setShopHistoryEn(s.shop_history_en || '');
        }
      })
      .catch(err => console.warn('Failed to fetch fresh settings:', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BACKEND_URL]);

  const updateSettingValue = async (key, value) => {
    try {
      const data = await fetchWithRetry(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ key, value })
      });

      if (data && data.success) {
        setToastMessage('រក្សាទុកជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);

        if (mutateShopData) {
          mutateShopData(prev => ({
            ...prev,
            settings: {
              ...(prev?.settings || {}),
              [key]: value
            }
          }));
        }

        if (key === 'shop_status' && setGlobalShopStatus) setGlobalShopStatus(value);
        if (key === 'promo_text' && setGlobalPromoText) setGlobalPromoText(value);
        if (key === 'promo_banner_url' && setGlobalPromoBannerUrl) setGlobalPromoBannerUrl(value);
        if (key === 'delivery_fee' && setGlobalDeliveryFee) setGlobalDeliveryFee(value);
        if (key === 'delivery_threshold' && setGlobalDeliveryThreshold) setGlobalDeliveryThreshold(value);
        if (key === 'shop_logo_url' && setGlobalShopLogoUrl) setGlobalShopLogoUrl(value);
        if (key === 'payment_qr_url' && setPaymentQrUrl) setPaymentQrUrl(value);
        if (key === 'payment_info' && setPaymentInfo) setPaymentInfo(value);
        refetchShopData(true);
        return true;
      } else {
        showAlert('បរាជ័យក្នុងការរក្សាទុក: ' + (data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
        return false;
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការរក្សាទុក: ' + err.message);
      return false;
    }
  };

  const handleBannerUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file); // already compressed by the caller
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success && (res.url || res.data?.url)) {
        const url = res.url || res.data.url;
        const entries = parseBannerEntries(promoBannerUrl);
        entries.push({ url, rawTarget: '' });
        const newBanners = serializeBannerEntries(entries);
        const saved = await updateSettingValue('promo_banner_url', newBanners);
        if (saved) {
          setPromoBannerUrl(newBanners);
          if (setGlobalPromoBannerUrl) setGlobalPromoBannerUrl(newBanners);
        }
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Banner: ' + (res.error || 'មានបញ្ហាក្នុងការបញ្ចូលរូបភាព'));
      }
    } catch (e) {
      showAlert('បរាជ័យក្នុងការបញ្ចូលរូប Banner: ' + e.message);
    }
  };

  const removeBanner = async (indexToRemove) => {
    const entries = parseBannerEntries(promoBannerUrl);
    const removedBanner = entries[indexToRemove];
    if (!removedBanner) return;
    entries.splice(indexToRemove, 1);
    const newBanners = serializeBannerEntries(entries);
    const saved = await updateSettingValue('promo_banner_url', newBanners);
    if (saved) {
      setPromoBannerUrl(newBanners);
      if (setGlobalPromoBannerUrl) setGlobalPromoBannerUrl(newBanners);
    }
  };

  const updateBannerProduct = async (index, newTargetStr) => {
    const entries = parseBannerEntries(promoBannerUrl);
    if (!entries[index]) return;
    entries[index].targetStr = newTargetStr;
    const newBanners = serializeBannerEntries(entries);
    const saved = await updateSettingValue('promo_banner_url', newBanners);
    if (saved) {
      setPromoBannerUrl(newBanners);
      if (setGlobalPromoBannerUrl) setGlobalPromoBannerUrl(newBanners);
    }
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file); // already compressed by the caller
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success && (res.url || res.data?.url)) {
        const url = res.url || res.data.url;
        const saved = await updateSettingValue('shop_logo_url', url);
        if (saved) {
          setShopLogoUrl(url);
          if (setGlobalShopLogoUrl) setGlobalShopLogoUrl(url);
        }
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូល Logo: ' + (res.error || 'មានបញ្ហាក្នុងការបញ្ចូលរូបភាព'));
      }
    } catch (e) {
      showAlert('បរាជ័យក្នុងការបញ្ចូល Logo: ' + e.message);
    }
  };

  const handleQrUpload = async (file) => {
    const formData = new FormData();
    formData.append('image', file); // already compressed by the caller
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success && (res.url || res.data?.url)) {
        const url = res.url || res.data.url;
        const saved = await updateSettingValue('payment_qr_url', url);
        if (saved) setPaymentQrUrl(url);
      } else {
        showAlert('បរាជ័យក្នុងការបញ្ចូល QR: ' + (res.error || 'មានបញ្ហាក្នុងការបញ្ចូលរូបភាព'));
      }
    } catch (e) {
      showAlert('បរាជ័យក្នុងការបញ្ចូល QR: ' + e.message);
    }
  };

  return (
    <AdminSettingsTab
      shopStatus={shopStatus} setShopStatus={setShopStatus} showConfirm={showConfirm}
      deliveryFee={deliveryFee} setDeliveryFee={setDeliveryFee} deliveryThreshold={deliveryThreshold} setDeliveryThreshold={setDeliveryThreshold}
      provincialDeliveryFee={provincialDeliveryFee} setProvincialDeliveryFee={setProvincialDeliveryFee}
      promoBannerUrl={promoBannerUrl} removeBanner={removeBanner} handleBannerUpload={handleBannerUpload} updateBannerProduct={updateBannerProduct} products={products} categories={categories}
      shopLogoUrl={shopLogoUrl} handleLogoUpload={handleLogoUpload}
      paymentQrUrl={paymentQrUrl} handleQrUpload={handleQrUpload} paymentInfo={paymentInfo} setPaymentInfo={setPaymentInfo}
      receiptShopName={receiptShopName} setReceiptShopName={setReceiptShopName}
      receiptSubtitle={receiptSubtitle} setReceiptSubtitle={setReceiptSubtitle}
      receiptNote={receiptNote} setReceiptNote={setReceiptNote}
      socialFb={socialFb} setSocialFb={setSocialFb}
      socialTg={socialTg} setSocialTg={setSocialTg}
      socialIg={socialIg} setSocialIg={setSocialIg}
      socialTt={socialTt} setSocialTt={setSocialTt}
      socialEmail={socialEmail} setSocialEmail={setSocialEmail}
      socialWa={socialWa} setSocialWa={setSocialWa}
      shopPhone={shopPhone} setShopPhone={setShopPhone}
      shopAddress={shopAddress} setShopAddress={setShopAddress}
      shopHours={shopHours} setShopHours={setShopHours}
      telegramChannelId={telegramChannelId} setTelegramChannelId={setTelegramChannelId}
      shopHistoryKh={shopHistoryKh} setShopHistoryKh={setShopHistoryKh}
      shopHistoryEn={shopHistoryEn} setShopHistoryEn={setShopHistoryEn}
      updateSettingValue={updateSettingValue}
      settingsReady={!!settingsData?.settings}
    />
  );
};

export default AdminSettingsContainer;
