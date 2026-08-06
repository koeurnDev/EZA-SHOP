import React, { useMemo } from 'react';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';

const AdminSettingsTab = React.memo(({
  shopStatus, showConfirm, setShopStatus, updateSettingValue,
  deliveryFee, setDeliveryFee, deliveryThreshold, setDeliveryThreshold,
  promoBannerUrl, removeBanner, handleBannerUpload,
  shopLogoUrl, handleLogoUpload,
  paymentQrUrl, handleQrUpload, paymentInfo, setPaymentInfo,
  receiptShopName, setReceiptShopName,
  receiptSubtitle, setReceiptSubtitle,
  receiptNote, setReceiptNote,
}) => {
  const { t } = useUser();

  const SHOP_STATUS_OPTIONS = useMemo(() => [
    { value: 'open', label: `🟢 ${t('admin_open')}` },
    { value: 'closed', label: `🔴 ${t('admin_closed')}` },
  ], [t]);

  return (
  <div className="tab-pane-animate">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Shop Status */}
      <div className="glass-card-luxury" style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '20px 28px', zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🏪 {t('admin_shop_status')}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{t('admin_shop_status_desc')}</div>
        </div>
        <div style={{ width: 150 }}>
          <DarkSelect
            value={shopStatus}
            onChange={async val => {
              showConfirm(
                val === 'open' ? t('admin_confirm_open') : t('admin_confirm_closed'),
                () => { setShopStatus(val); updateSettingValue('shop_status', val); },
                '🏪'
              );
            }}
            options={SHOP_STATUS_OPTIONS}
          />
        </div>
      </div>

      {/* Delivery */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>🚚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>{t('delivery_label')}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{t('admin_delivery_desc')}</div>
          </div>
        </div>
        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>{t('admin_delivery_fee')}</label>
            <input className="input-glass-admin" placeholder="0.00" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>{t('admin_free_delivery_threshold')}</label>
            <input className="input-glass-admin" placeholder="50.00" value={deliveryThreshold} onChange={e => setDeliveryThreshold(e.target.value)} />
          </div>
        </div>
        <button className="ticket-btn-primary" onClick={() => { updateSettingValue('delivery_fee', deliveryFee); updateSettingValue('delivery_threshold', deliveryThreshold); }}>
          💾 {t('admin_save_settings')}
        </button>
      </div>

      {/* Banners + Logo */}
      <div className="admin-responsive-grid" style={{ gap: 15 }}>
        <div className="glass-card-luxury" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🖼️ {t('admin_shop_banner')}</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
            {(promoBannerUrl ? promoBannerUrl.split(',').map(u => u.trim()).filter(Boolean) : []).map((img, idx) => (
              <div key={idx} style={{ position: 'relative', flexShrink: 0, width: 140, height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
                <button className="remove-thumb-btn" onClick={() => removeBanner(idx)}>✕</button>
              </div>
            ))}
            <label className="upload-zone-luxury" style={{ flexShrink: 0, width: 140, height: 80 }}>
              <div className="upload-label-content">
                <div style={{ fontSize: 22 }}>🌄</div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{t('admin_add_banner')}</div>
              </div>
              <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) handleBannerUpload(file); }} />
            </label>
          </div>
        </div>
        <div className="glass-card-luxury" style={{ padding: 20, minWidth: 0 }}>
          <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🏷️ {t('admin_shop_logo')}</div>
          <label className="upload-zone-luxury" style={{ height: 110 }}>
            {shopLogoUrl ? (
              <img src={shopLogoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
            ) : (
              <div className="upload-label-content">
                <div style={{ fontSize: 22 }}>🏷️</div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{t('admin_change_logo')}</div>
              </div>
            )}
            <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); }} />
          </label>
        </div>
      </div>

      {/* Payment */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>💳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>ព័ត៌មានបង់ប្រាក់</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>កំណត់រូប QR និងលេខគណនីធនាគារ</div>
          </div>
        </div>
        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 15 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>រូបភាព QR (KHQR)</label>
            <label className="upload-zone-luxury" style={{ height: 120 }}>
              {paymentQrUrl ? (
                <img src={paymentQrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" crossOrigin="anonymous" />
              ) : (
                <div className="upload-label-content">
                  <div style={{ fontSize: 22 }}>📸</div>
                  <div style={{ fontSize: 10, fontWeight: 900 }}>ដាក់រូប QR</div>
                </div>
              )}
              <input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (file) handleQrUpload(file); }} />
            </label>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>ព័ត៌មានគណនី</label>
            <textarea className="input-glass-admin" style={{ height: 120, fontSize: 12 }} placeholder="ឧទាហរណ៍៖ ABA: 000 111 222 (NAME)" value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} />
          </div>
        </div>
        <button className="ticket-btn-primary" onClick={() => updateSettingValue('payment_info', paymentInfo)}>
          💾 រក្សាទុកព័ត៌មានបង់ប្រាក់
        </button>
      </div>

      {/* Receipt */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>🖨️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>ព័ត៌មានវិក្កយបត្រ</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>កំណត់ឈ្មោះ និងអក្សររត់ពីក្រោមលើវិក្កយបត្រ</div>
          </div>
        </div>
        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 15 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>ឈ្មោះហាង</label>
            <input className="input-glass-admin" value={receiptShopName} onChange={e => setReceiptShopName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>អក្សររត់ពីក្រោម</label>
            <input className="input-glass-admin" value={receiptSubtitle} onChange={e => setReceiptSubtitle(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>កំណត់ចំណាំហាង</label>
          <textarea className="input-glass-admin" rows="2" value={receiptNote} onChange={e => setReceiptNote(e.target.value)} placeholder="សូមអរគុណសម្រាប់ការគាំទ្រ!" />
        </div>
        <button className="ticket-btn-primary" onClick={() => { updateSettingValue('receipt_shop_name', receiptShopName); updateSettingValue('receipt_subtitle', receiptSubtitle); updateSettingValue('receipt_note', receiptNote); }}>
          💾 រក្សាទុកវិក្កយបត្រ
        </button>
      </div>
    </div>
  </div>
);
});

export default AdminSettingsTab;
