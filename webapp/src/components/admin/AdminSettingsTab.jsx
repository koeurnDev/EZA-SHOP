import React, { useMemo } from 'react';
import DarkSelect from './DarkSelect';
import { useUser } from '../../context/UserContext';

const AdminSettingsTab = React.memo(({
  shopStatus, showConfirm, setShopStatus, updateSettingValue,
  deliveryFee, setDeliveryFee, deliveryThreshold, setDeliveryThreshold,
  promoBannerUrl, removeBanner, handleBannerUpload, updateBannerProduct, products, categories,
  shopLogoUrl, handleLogoUpload,
  paymentQrUrl, handleQrUpload, paymentInfo, setPaymentInfo,
  receiptShopName, setReceiptShopName,
  receiptSubtitle, setReceiptSubtitle,
  receiptNote, setReceiptNote,
  socialFb, setSocialFb,
  socialTg, setSocialTg,
  socialIg, setSocialIg,
  socialTt, setSocialTt,
  socialEmail, setSocialEmail,
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
      <div className="glass-card-luxury" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: '20px', zIndex: 10 }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🏪 {t('admin_shop_status')}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{t('admin_shop_status_desc')}</div>
        </div>
        <div style={{ width: '100%', maxWidth: 180, flex: '1 1 120px' }}>
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

      {/* Delivery Settings */}
      <div className="glass-card-luxury" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#3b82f6' }}>🚚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16, color: 'var(--text-bold)' }}>{t('delivery_label') || 'សេវាដឹកជញ្ជូន'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t('admin_delivery_desc') || 'កំណត់តម្លៃដឹក និងលក្ខខណ្ឌដឹកហ្វ្រី'}</div>
          </div>
        </div>

        <div className="admin-responsive-grid" style={{ gap: 16, marginBottom: 22 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 8, color: 'var(--text-bold)' }}>{t('admin_delivery_fee') || 'ថ្លៃសេវាដឹកជញ្ជូន'}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 900, color: 'var(--text-muted)', zIndex: 2 }}>$</span>
              <input 
                className="input-glass-admin" 
                type="number"
                step="0.01"
                style={{ paddingLeft: 38, width: '100%', fontSize: 14, fontWeight: 800 }} 
                placeholder="1.50" 
                value={deliveryFee} 
                onChange={e => setDeliveryFee(e.target.value)} 
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.8 }}>ឧទាហរណ៍៖ 1.50 (ដាក់ 0 ប្រសិនបើដឹកហ្វ្រីគ្រប់ order)</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 900, marginBottom: 8, color: 'var(--text-bold)' }}>{t('admin_free_delivery_threshold') || 'ដឹកហ្វ្រីចាប់ពី'}</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 14, fontSize: 15, fontWeight: 900, color: 'var(--text-muted)', zIndex: 2 }}>$</span>
              <input 
                className="input-glass-admin" 
                type="number"
                step="1"
                style={{ paddingLeft: 38, width: '100%', fontSize: 14, fontWeight: 800 }} 
                placeholder="50.00" 
                value={deliveryThreshold} 
                onChange={e => setDeliveryThreshold(e.target.value)} 
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, opacity: 0.8 }}>ទិញអស់ចាប់ពី ${deliveryThreshold || '50'} ឡើងទៅ នឹងទទួលបានការដឹកហ្វ្រី</div>
          </div>
        </div>

        <button 
          style={{ 
            width: '100%', padding: '13px 20px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff', fontWeight: 900, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s ease'
          }}
          onClick={() => { updateSettingValue('delivery_fee', deliveryFee); updateSettingValue('delivery_threshold', deliveryThreshold); }}
        >
          💾 {t('admin_save_settings') || 'រក្សាទុកការកំណត់'}
        </button>
      </div>

      {/* Banners + Logo */}
      <div className="admin-responsive-grid" style={{ gap: 15 }}>
        <div className="glass-card-luxury" style={{ padding: 20, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontWeight: 950, marginBottom: 15, fontSize: 14 }}>🖼️ {t('admin_shop_banner')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(promoBannerUrl ? promoBannerUrl.split(',').map(u => u.trim()).filter(Boolean) : []).map((img, idx) => {
              const [url, targetStr] = img.split('|');
              let linkType = '';
              let linkValue = '';
              if (targetStr) {
                if (targetStr.startsWith('cat:')) { linkType = 'cat'; linkValue = targetStr.substring(4); }
                else if (targetStr.startsWith('ext:')) { linkType = 'ext'; linkValue = targetStr.substring(4); }
                else if (targetStr.startsWith('prod:')) { linkType = 'prod'; linkValue = targetStr.substring(5); }
                else { linkType = 'prod'; linkValue = targetStr; }
              }

              return (
              <div key={idx} style={{ position: 'relative', width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ position: 'relative', width: '100%', height: 80, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" crossOrigin="anonymous" />
                  <button className="remove-thumb-btn" onClick={() => removeBanner(idx)}>✕</button>
                </div>
                
                <select
                  value={linkType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    if (!newType) updateBannerProduct(idx, '');
                    else if (newType === 'prod' && products?.length) updateBannerProduct(idx, `prod:${products[0].id}`);
                    else if (newType === 'cat' && categories?.length) updateBannerProduct(idx, `cat:${categories[0].id}`);
                    else if (newType === 'ext') updateBannerProduct(idx, `ext:https://`);
                  }}
                  style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                >
                  <option value="">- គ្មាន Link -</option>
                  <option value="prod">ទំនិញ</option>
                  <option value="cat">ប្រភេទទំនិញ</option>
                  <option value="ext">Link ខាងក្រៅ</option>
                </select>

                {linkType === 'prod' && (
                  <select
                    value={linkValue}
                    onChange={(e) => updateBannerProduct(idx, `prod:${e.target.value}`)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                  >
                    {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {linkType === 'cat' && (
                  <select
                    value={linkValue}
                    onChange={(e) => updateBannerProduct(idx, `cat:${e.target.value}`)}
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}
                  >
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {linkType === 'ext' && (
                  <input
                    type="text"
                    value={linkValue}
                    onChange={(e) => updateBannerProduct(idx, `ext:${e.target.value}`)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '4px', fontSize: '10px', background: 'var(--bg-soft)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            )})}
            <label className="upload-zone-luxury" style={{ flexShrink: 0, width: 140, height: 80 }}>
              <div className="upload-label-content" style={{ minHeight: 'auto', padding: 10 }}>
                <div style={{ fontSize: 22 }}>🌄</div>
                <div style={{ fontSize: 11, fontWeight: 900 }}>{t('admin_add_banner')}</div>
              </div>
              <input type="file" accept="image/*" onChange={async e => { 
                const file = e.target.files?.[0]; 
                if (file) {
                  await handleBannerUpload(file); 
                }
                e.target.value = ''; 
              }} />
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
      {/* Social Media & Contact Links */}
      <div className="glass-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ fontSize: 24 }}>📱</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 950, fontSize: 16 }}>បណ្ដាញសង្គម / ទំនាក់ទំនង</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>ភ្ជាប់បណ្ដាញសង្គមដើម្បីអោយអតិថិជនងាយស្រួលទាក់ទង</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Facebook URL</label>
            <input className="input-glass-admin" placeholder="https://facebook.com/..." value={socialFb} onChange={e => setSocialFb(e.target.value)} onBlur={e => updateSettingValue('social_fb', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Telegram Username / Link</label>
            <input className="input-glass-admin" placeholder="https://t.me/..." value={socialTg} onChange={e => setSocialTg(e.target.value)} onBlur={e => updateSettingValue('social_tg', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Instagram URL</label>
            <input className="input-glass-admin" placeholder="https://instagram.com/..." value={socialIg} onChange={e => setSocialIg(e.target.value)} onBlur={e => updateSettingValue('social_ig', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>TikTok URL</label>
            <input className="input-glass-admin" placeholder="https://tiktok.com/..." value={socialTt} onChange={e => setSocialTt(e.target.value)} onBlur={e => updateSettingValue('social_tt', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, opacity: 0.8 }}>Email Address</label>
            <input className="input-glass-admin" placeholder="contact@example.com" value={socialEmail} onChange={e => setSocialEmail(e.target.value)} onBlur={e => updateSettingValue('social_email', e.target.value)} />
          </div>
        </div>
      </div>

    </div>
  </div>
);
});

export default AdminSettingsTab;
