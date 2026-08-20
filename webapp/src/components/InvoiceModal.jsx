import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { useTelegram } from '../context/TelegramContext';
import { getVariantUnitMode, getCapacityLabel } from '../utils/variantUnitUtils';
import { isPaymentConfirmed } from '../utils/orderItemUtils';
import { compressImage } from '../utils/imageUtils';

/**
 * 🎨 Success Animation (Luxury Checkmark)
 */
const SuccessCheckmark = () => (
  <div className="checkmark-wrapper">
    <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
    <style>{`
      .checkmark-wrapper { width: 80px; height: 80px; margin: 0 auto 30px; position: relative; }
      .checkmark-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: var(--primary-accent); fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
      .checkmark-svg { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 2; stroke: white; stroke-miterlimit: 10; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
      .checkmark-check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
      @keyframes stroke { 100% { stroke-dashoffset: 0; } }
      @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
      @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px var(--primary-accent); } }
    `}</style>
  </div>
);

/**
 * 🧾 High-Fidelity Invoice Modal
 * Matches the "Digital Parchment" luxury design.
 */
const InvoiceModal = ({ order, onClose, paymentQrUrl, paymentInfo, BACKEND_URL, onPaymentSuccess, onConfirmPayment, onCartClear, t, lang }) => {
  const { switchInlineQuery, showAlert, HapticFeedback } = useTelegram();
  const [localOrder, setLocalOrder] = useState(order);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showReceipt, setShowReceipt] = useState(false);
  const [miniQrUrl, setMiniQrUrl] = useState('');
  const [dynamicQr, setDynamicQr] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [qrError, setQrError] = useState('');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [logoDataUrl, setLogoDataUrl] = useState('');
  const receiptRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleReceiptUpload = async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || localOrder?.id === 'DRAFT') return;
    setIsUploadingReceipt(true);
    setUploadError('');
    
    try {
      const compressedFile = await compressImage(rawFile, 1200, 1200, 0.8);
      const fd = new FormData();
      fd.append('image', compressedFile);

      const tgData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch(`${BACKEND_URL}/api/upload?send_to_user=true`, { 
        method: 'POST', 
        headers: { 'X-TG-Data': tgData }, 
        body: fd 
      });
      const data = await res.json();
      const uploadedUrl = data.url || data.data?.url;
      if (!data.success || !uploadedUrl) {
        throw new Error(data.error || (lang === 'kh' ? 'មានបញ្ហាក្នុងការផ្ទុករូបភាព' : 'Upload failed'));
      }

      const receiptRes = await fetch(`${BACKEND_URL}/api/orders/receipt`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-TG-Data': tgData
        },
        body: JSON.stringify({ orderCode: localOrder.order_code, receiptUrl: uploadedUrl })
      });
      const receiptData = await receiptRes.json();
      if (!receiptData.success) {
        throw new Error(receiptData.error || (lang === 'kh' ? 'មិនអាចភ្ជាប់វិក្កយបត្រទៅការកម្ម៉ង់' : 'Could not link receipt to order'));
      }

      setReceiptUploaded(true);
      setLocalOrder(prev => ({ ...prev, receipt_url: uploadedUrl, ...(receiptData.order || {}) }));
      HapticFeedback?.notificationOccurred('success');

      if (typeof onCartClear === 'function') onCartClear();
    } catch (err) {
      console.error(err);
      setReceiptUploaded(false);
      setUploadError(err.message || (lang === 'kh' ? 'មានបញ្ហាបណ្តាញទាក់ទង' : 'Network Error'));
      setTimeout(() => setUploadError(''), 5000);
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  const handleVerifyPayment = async () => {
    if (localOrder?.id === 'DRAFT' || receiptUploaded || !onConfirmPayment) return;
    setIsVerifying(true);
    try {
      const ok = await onConfirmPayment(localOrder.id);
      if (ok) {
        setLocalOrder(prev => ({ ...prev, status: 'paid' }));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const img = new Image();
    img.src = '/favicon.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          setLogoDataUrl(dataUrl);
        } catch (e) {
          console.warn("Failed to convert logo to data URL:", e);
        }
      }
    };
  }, []);

  // 🔄 Sync local order when parent prop updates (Essential for Draft -> Real transition)
  useEffect(() => {
    if (order) {
      setLocalOrder(order);
      if (order.receipt_url) setReceiptUploaded(true);
    }
  }, [order]);

  if (!localOrder) return null;

  const isDraft = localOrder.id === 'DRAFT';
  const displayId = isDraft ? '...' : (localOrder.order_code || String(localOrder.id));
  const dbId = localOrder.id;
  const items = React.useMemo(() => typeof localOrder.items === 'string' ? JSON.parse(localOrder.items) : localOrder.items, [localOrder.items]);

  const orderStatus = localOrder.status;

  // 🕒 SERVER-SYNCED TIMER: Direct sync with Server's expires_in
  useEffect(() => {
    if (isPaymentConfirmed(orderStatus) || isExpired || orderStatus === 'cancelled') return;

    // Use server's remaining time directly
    const initialRemaining = localOrder.expires_in !== undefined ? localOrder.expires_in : 300;

    setTimeLeft(initialRemaining);
    if (initialRemaining <= 0 && !isDraft) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderStatus, isDraft, localOrder.expires_in, isExpired]);

  useEffect(() => {
    if (showReceipt) {
      QRCode.toDataURL(`https://t.me/momo_boutique_bot?start=check_${dbId}`, { width: 120, margin: 1 })
        .then(url => setMiniQrUrl(url));
    }
  }, [showReceipt, dbId]);

  useEffect(() => {
    if (localOrder?.qr_string) {
      try {
        QRCode.toDataURL(localOrder.qr_string, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' } // 🛡 Force High Contrast for Scanners
        })
          .then(url => setDynamicQr(url))
          .catch(err => {
            console.error("QR Generate Fail:", err);
            setQrError(err.message || 'QR Promise Error');
          });
      } catch (err) {
        console.error("QR Sync Error:", err);
        setQrError(err.message || 'QR Sync Error');
      }
    }
  }, [localOrder?.qr_string]);

  // 🚀 HARDENED: Exponential Backoff Polling with Network Resilience
  useEffect(() => {
    if (orderStatus === 'paid' || isExpired || isDraft) return;

    const currentDelay = attempts < 10 ? 5000 : attempts < 20 ? 10000 : attempts < 40 ? 30000 : 60000;

    const interval = setTimeout(async () => {
      const tgData = window.Telegram?.WebApp?.initData || '';
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
          headers: { 
            'X-TG-Data': tgData
          }
        });
        const data = await res.json();
        
        setIsOffline(false);
        setAttempts(prev => prev + 1);

        if (data.success) {
          setLocalOrder(data.order);
          if (data.order.status === 'paid') {
            if (onPaymentSuccess) onPaymentSuccess();
            setTimeout(() => {
              setShowReceipt(true);
              window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
            }, 1000);
          }
        }
      } catch (err) {
        console.warn('📡 Network Flickering. Retrying...');
        setIsOffline(true);
        setAttempts(prev => prev + 1);
      }
    }, currentDelay);

    return () => clearTimeout(interval);
  }, [localOrder.order_code, orderStatus, attempts, BACKEND_URL, onPaymentSuccess, isExpired]);

  const handleRefreshQR = async () => {
    setIsVerifying(true);
    const tgData = window.Telegram?.WebApp?.initData || '';
    try {
      const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
        headers: { 
          'X-TG-Data': tgData
        }
      });
      const data = await res.json();
      if (data.success) {
        setLocalOrder(data.order);
        setIsExpired(false);
        setAttempts(0);
        HapticFeedback?.impactOccurred('medium');
        if (data.order?.status === 'paid' && onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      console.error("Refresh Fail:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderReceipt = () => (
    <div className="receipt-luxury-paper animate-up p-0 overflow-hidden bg-white text-slate-900 rounded-[24px]">

      {/* ── Receipt Content to Save ── */}
      <div ref={receiptRef} className="bg-white text-slate-900 pb-[14px]">
        {/* ── HEADER ── */}
        <div className="text-center px-[18px] pt-[20px] pb-[14px] border-b border-dashed border-slate-200">
          <div className="inline-block p-1.5 bg-slate-50 rounded-2xl mb-2">
            <img src={logoDataUrl || "/favicon.png"} alt="Vibe Lifestyle" crossOrigin="anonymous" className="w-[44px] h-[44px] rounded-[10px] block" />
          </div>
          <div className="text-[13px] font-black text-slate-900 tracking-[2px]">Vibe Lifestyle</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">
            {!isDraft && (() => {
              const d = new Date(localOrder.created_at);
              const dateStr = d.toLocaleDateString(lang === 'kh' ? 'km-KH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '');
              const h = d.getHours();
              const m = String(d.getMinutes()).padStart(2, '0');
              const ampm = h >= 12 ? 'PM' : 'AM';
              const hour = h % 12 || 12;
              return `${dateStr}, ${hour}:${m} ${ampm}`;
            })()}
          </div>
        </div>

        <div className="px-[18px] py-[14px]">

          {/* ── TOTAL ── */}
          <div className="text-center mb-3">
            <div className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[1.5px] mb-0.5">{t('final_total')}</div>
            <div className="text-[36px] font-black text-[#d4af37] leading-none">${parseFloat(localOrder.total).toFixed(2)}</div>
            <div className="mt-1.5">
              <span className="bg-green-100 text-green-600 text-[10px] font-black px-3 py-[3px] rounded-full">
                ✓ {lang === 'kh' ? 'ការបញ្ជាទិញបានបញ្ជាក់' : 'Confirmed'}
              </span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200 my-2.5" />

          {/* ── CUSTOMER INFO ── */}
          {[
            { label: lang === 'kh' ? 'អតិថិជន' : 'Customer', value: localOrder.user_name || 'Guest' },
            { label: lang === 'kh' ? 'ទូរស័ព្ទ' : 'Phone', value: localOrder.phone || '—' },
            { label: lang === 'kh' ? 'អាសយដ្ឋាន' : 'Address', value: `${localOrder.address || ''}${localOrder.province ? ', ' + localOrder.province : ''}` },
            localOrder.delivery_company ? { label: lang === 'kh' ? 'ក្រុមហ៊ុនដឹក' : 'Courier', value: `🚚 ${localOrder.delivery_company}` } : null,
          ].filter(Boolean).map((row, i) => (
            <div key={i} className="flex justify-between gap-2 mb-1.5">
              <span className="text-[11px] text-slate-500 font-bold shrink-0">{row.label}</span>
              <span className="text-[11px] font-extrabold text-slate-900 text-right break-words max-w-[62%]">{row.value}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-slate-200 my-2.5" />

          {/* ── ITEMS ── */}
          {items && items.map((item, idx) => {
            const sizeLabel = item.selectedSize
              ? `${getCapacityLabel(lang, getVariantUnitMode({ category: item.category, productName: item.name, variantSizes: [item.selectedSize] }))}: ${item.selectedSize}`
              : '';
            const colorLabel = item.selectedColor ? `${lang === 'kh' ? 'ពណ៌' : 'Color'}: ${item.selectedColor}` : '';
            const variantMeta = [sizeLabel, colorLabel].filter(Boolean).join(' · ');
            return (
              <div key={idx} className={`flex justify-between items-start mb-1.5 pb-1.5 ${idx < items.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <span className="text-[12px] font-extrabold text-slate-900 flex-1 pr-2">
                  <span>{item.name}</span>
                  <span className="text-slate-500 font-bold"> ×{item.quantity}</span>
                  {variantMeta && (
                    <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">{variantMeta}</span>
                  )}
                </span>
                <span className="text-[12px] font-black text-slate-900 shrink-0">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
              </div>
            );
          })}

          {/* ── PRICE BOX ── */}
          <div className="bg-slate-50 rounded-[10px] py-2 px-3 mt-2 mb-2.5 border border-slate-100">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-slate-500 font-bold">{lang === 'kh' ? 'សរុបដើម' : 'Subtotal'}</span>
              <span className="text-[11px] font-extrabold text-slate-900">${parseFloat(localOrder.subtotal || localOrder.total).toFixed(2)}</span>
            </div>
            {parseFloat(localOrder.discount_amount) > 0 && (
              <div className="flex justify-between mb-1 text-red-500">
                <span className="text-[11px] font-bold">{lang === 'kh' ? 'បញ្ចុះតម្លៃ' : 'Discount'}</span>
                <span className="text-[11px] font-extrabold">-${parseFloat(localOrder.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 font-bold">{lang === 'kh' ? 'ថ្លៃដឹក' : 'Delivery'}</span>
              <span className="text-[11px] font-extrabold text-emerald-500">{parseFloat(localOrder.delivery_fee) === 0 ? (lang === 'kh' ? 'ឥតគិតថ្លៃ' : 'Free') : `$${parseFloat(localOrder.delivery_fee).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200">
              <span className="text-[13px] font-black text-slate-900">{t('final_total')}</span>
              <span className="text-[15px] font-black text-[#d4af37]">${parseFloat(localOrder.total).toFixed(2)}</span>
            </div>
          </div>

          {/* ── REF NUMBER ── */}
          <div className="flex justify-between items-center bg-[#d4af37]/5 border border-dashed border-[#d4af37] rounded-lg py-[7px] px-3 mb-2.5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[1px]">{lang === 'kh' ? 'លេខកូដ' : 'Ref #'}</span>
            <span className="text-[13px] font-black text-[#d4af37] font-mono tracking-[1.5px]">
              {isDraft ? '...' : (localOrder.order_code || String(localOrder.id))}
            </span>
          </div>

          {/* ── QR CODE ── */}
          {miniQrUrl && (
            <div className="text-center mb-3">
              <div className="inline-block bg-white p-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
                <img src={miniQrUrl} alt="QR" className="w-[80px] h-[80px] block rounded-md" />
              </div>
              <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-[1px] mt-1.25">
                {lang === 'kh' ? 'ស្កេនដើម្បីផ្ទៀងផ្ទាត់' : 'Scan to Verify'}
              </div>
            </div>
          )}

          {/* ── END OF RECEIPT CONTENT ── */}
        </div>
      </div>

      {/* ── BUTTONS (Excluded from saved image) ── */}
      <div className="flex gap-2 px-[18px] pt-[12px] pb-[14px] bg-white border-t border-slate-100">
        <button
          onClick={async () => {
            if (!receiptRef.current) return;
            setIsSaving(true);
            try {
              const canvas = await html2canvas(receiptRef.current, { scale: 3, backgroundColor: '#ffffff', useCORS: true });

              // 1. Direct local download (Works on Desktop / standard browsers)
              const image = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = image;
              link.download = `Receipt_${displayId}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // 2. Upload & Open Link (Allows Telegram Mobile App users to save to Phone Gallery + sends to chat)
              canvas.toBlob(async (blob) => {
                if (!blob) return;
                try {
                  const formData = new FormData();
                  formData.append('image', blob, `receipt_${displayId}.png`);
                  const tgData = window.Telegram?.WebApp?.initData || '';
                  const res = await fetch(`${BACKEND_URL}/api/upload?send_to_user=true`, {
                    method: 'POST',
                    headers: { 'X-TG-Data': tgData },
                    body: formData
                  });
                  const data = await res.json();
                  if (data.success && data.url) {
                    const msg = lang === 'kh'
                      ? 'វិក្កយបត្រត្រូវបានរក្សាទុក និងផ្ញើទៅកាន់សារផ្ទាល់ខ្លួនរបស់អ្នករួចរាល់ហើយ!'
                      : 'Invoice has been saved and sent to your personal Telegram chat!';
                    showAlert(msg);

                    if (window.Telegram?.WebApp?.openLink) {
                      window.Telegram.WebApp.openLink(data.url);
                    } else {
                      window.open(data.url, '_blank');
                    }
                  } else {
                    throw new Error(data.error || 'Server error');
                  }
                } catch (e) {
                  console.error("Upload fallback failed:", e);
                  const errorMsg = lang === 'kh'
                    ? 'ការរក្សាទុកវិក្កយបត្របានបរាជ័យ។ សូមព្យាយាមម្តងទៀត!'
                    : 'Failed to save receipt. Please try again!';
                  showAlert(errorMsg);
                }
              }, 'image/png');

              if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            } catch (err) {
              console.error("Failed to save receipt", err);
              const errorMsg = lang === 'kh'
                ? 'ការរក្សាទុកវិក្កយបត្របានបរាជ័យ។ សូមព្យាយាមម្តងទៀត!'
                : 'Failed to save receipt. Please try again!';
              showAlert(errorMsg);
            } finally {
              setIsSaving(false);
            }
          }}
          disabled={isSaving}
          className={`detail-btn-cart-luxury flex-1 h-[42px] text-[12px] rounded-[10px] bg-[var(--primary-gradient)] text-white font-extrabold border-none ${isSaving ? 'opacity-70' : 'opacity-100'}`}>
          {isSaving ? '⌛...' : `📥 ${lang === 'kh' ? 'រក្សាទុក' : 'Save'}`}
        </button>
        <button
          onClick={onClose}
          className="detail-btn-cart-luxury flex-1 h-[42px] rounded-[10px] text-[12px] bg-slate-100 text-slate-900 font-extrabold shadow-none border border-slate-200">
          {lang === 'kh' ? 'បិទ' : 'Close'}
        </button>
      </div>

    </div>
  );

  return (
    <div className="modal-overlay bg-[var(--glass-bg)] z-[9999] flex items-center justify-center p-5">
      <div className="w-full max-w-[400px] max-h-[90vh] overflow-y-auto rounded-[24px]">
        {isExpired ? (
          <div className="order-card-luxury animate-in text-center border-[#fee2e2] pt-[60px] pb-[40px] px-[30px]">
            <div className="text-[70px] mb-[25px]">⏳</div>
            <h2 className="invoice-expired-title">{lang === 'kh' ? 'ការកុម្ម៉ង់ហួសពេល' : 'Order Expired'}</h2>
            <p className="invoice-expired-text">{lang === 'kh' ? 'សុំទោស! រយៈពេលបង់ប្រាក់ ៥ នាទីត្រូវបានបញ្ជប់។ សូមសាកល្បងម្តងទៀត។' : 'Sorry! The 5-minute payment window has closed. Please try again.'}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleRefreshQR} className="detail-btn-buy-luxury" disabled={isVerifying}>
                {isVerifying ? '...' : (lang === 'kh' ? '🔄 ធ្វើឱ្យ QR ថ្មី' : '🔄 Refresh QR')}
              </button>
              <button onClick={onClose} className="back-btn-pill opacity-70">{lang === 'kh' ? 'បិទ' : 'Close'}</button>
            </div>
          </div>
        ) : orderStatus === 'cancelled' ? (
          <div className="order-card-luxury animate-in text-center border-red-500/20 pt-[50px] pb-[40px] px-[30px]">
            <div className="text-[60px] mb-5">❌</div>
            <h2 className="text-[22px] font-black text-[var(--text-bold)] mb-2.5">
              {lang === 'kh' ? 'ការកម្ម៉ង់ត្រូវបានបោះបង់' : 'Order Cancelled'}
            </h2>
            <p className="text-[14px] text-[var(--text-muted)] mb-8 leading-relaxed">
              {lang === 'kh' ? 'ការកម្ម៉ង់នេះមិនបានបញ្ជាក់ការបង់ប្រាក់ ដូច្នេះមិនមានវិក្កយបត្រ។' : 'Payment was not confirmed, so no receipt is available.'}
            </p>
            <button onClick={onClose} className="back-btn-pill">{lang === 'kh' ? 'បិទ' : 'Close'}</button>
          </div>
        ) : isPaymentConfirmed(orderStatus) ? (
          renderReceipt()
        ) : (
          <div className="khqr-premium-box animate-up">
            <div className="khqr-terminal-header">
              <div className="khqr-brand-tag">
                <span className="bg-white text-[#ea1c24] px-2 py-0.5 rounded-md text-[12px] font-black">KHQR</span>
              </div>
              <button
                onClick={onClose}
                className="bg-white/20 border-none text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-[14px] font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="khqr-body">
              <div className="khqr-shop-name order-id-lux">Vibe Lifestyle</div>
              <div className="khqr-amount-lux">${parseFloat(localOrder.total).toFixed(2)}</div>

              {(localOrder.user_name || localOrder.phone) && (
                <div className="khqr-meta-pill">
                  {localOrder.user_name || 'Customer'}{localOrder.phone ? ` • ${localOrder.phone}` : ''}
                </div>
              )}

              {isDraft ? (
                <div className="khqr-preparing-wrap">
                  <div className="text-[36px] mb-3 animate-spin">⏳</div>
                  <div className="khqr-preparing-title">{lang === 'kh' ? 'កំពុងរៀបចំការកម្ម៉ង់...' : 'Preparing Order...'}</div>
                  <div className="khqr-preparing-sub">{lang === 'kh' ? 'សូមរង់ចាំបន្តិច ពេលកំពុងភ្ជាប់ទៅកាន់ប្រព័ន្ធ...' : 'Please wait while we connect to the system...'}</div>
                </div>
              ) : (
                <>
                  {!receiptUploaded ? (
                    <>
                      <div className="qr-code-wrapper-lux">
                        {localOrder.bakong_qr_string ? (
                          <div className="flex justify-center p-2.5 bg-white rounded-xl">
                            <QRCodeSVG value={localOrder.bakong_qr_string} size={180} level="M" includeMargin={true} />
                          </div>
                        ) : dynamicQr ? (
                          <img src={dynamicQr} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : paymentQrUrl ? (
                          <img src={paymentQrUrl} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : (
                          <div className="khqr-payment-details">
                            <div className="animate-in text-center p-2.5">
                              <div className="text-[32px] mb-2">🏦</div>
                              <div className="khqr-payment-details-title">{lang === 'kh' ? 'ព័ត៌មានបង់ប្រាក់' : 'Payment Details'}</div>
                              <div className="khqr-payment-details-body">
                                {paymentInfo || 'ABA KHQR'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`khqr-timer${timeLeft < 60 ? ' khqr-timer--urgent' : ''}`}>
                        <span className="opacity-60">⏳</span>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </>
                  ) : (
                    <div className="khqr-summary-box animate-in">
                      <div className="khqr-summary-title">
                        {lang === 'kh' ? '🛍️ សេចក្តីសង្ខេបការកម្ម៉ង់' : '🛍️ Order Summary'}
                      </div>
                      <div className="max-h-[160px] overflow-y-auto">
                        {items?.map((item, idx) => (
                          <div key={idx} className="khqr-summary-item">
                            <span className="flex flex-col gap-0.5">
                              <span>{item.name}</span>
                              <span className="khqr-summary-item-meta">
                                {item.selectedSize ? `${getCapacityLabel(lang, getVariantUnitMode({ category: item.category, productName: item.name, variantSizes: [item.selectedSize] }))}: ${item.selectedSize} ` : ''}
                                {item.selectedColor ? (`${lang === 'kh' ? 'ពណ៌' : 'Color'}: ${item.selectedColor} `) : ''}
                                Qty: {item.quantity}
                              </span>
                            </span>
                            <span className="font-extrabold">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="khqr-summary-total">
                        <span>{lang === 'kh' ? 'សរុប' : 'Total'}</span>
                        <span>${localOrder.total?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  )}

                  {!receiptUploaded ? (
                    <div className="khqr-info-box">
                      {lang === 'kh'
                        ? '① ស្កេន QR បង់ប្រាក់ → ② ចុច "ដាក់វិក្កយបត្របញ្ជាក់" ខាងក្រោម (កុំផ្ញើតែក្នុង chat) → ③ រង់ចាំ Admin បញ្ជាក់។'
                        : '① Scan QR to pay → ② Tap "Upload Receipt" below (don\'t only DM admin) → ③ Wait for admin confirmation.'}
                    </div>
                  ) : (
                    <div className="text-[12px] text-emerald-500 font-extrabold mb-3.5 text-center leading-relaxed bg-emerald-500/10 py-2.5 px-3.5 rounded-xl">
                      {lang === 'kh' ? '✅ ទទួលបានជោគជ័យ! អរគុណសម្រាប់ការបង់ប្រាក់។ ក្រុមការងារយើងខ្ញុំកំពុងពិនិត្យ និងរៀបចំការកម្ម៉ង់ជូនលោកអ្នក។' : '✅ Received Successfully! Thank you for your payment. Our team is verifying and preparing your order.'}
                    </div>
                  )}

                  <div className="khqr-actions">
                    {uploadError && (
                      <div className="text-[12px] text-red-500 font-black text-center bg-red-500/10 p-2 rounded-[10px]">
                        ⚠️ {uploadError}
                      </div>
                    )}
                    {!receiptUploaded && (
                      <>
                        <label className="khqr-upload-btn">
                          {isUploadingReceipt ? (lang === 'kh' ? '⌛ កំពុងផ្ទុក...' : '⌛ Uploading...') : (lang === 'kh' ? '📥 ដាក់វិក្កយបត្របញ្ជាក់ (Screenshot)' : '📥 Upload Payment Screenshot')}
                          <input type="file" accept="image/*" className="hidden" disabled={isUploadingReceipt || receiptUploaded} onChange={handleReceiptUpload} />
                        </label>
                      </>
                    )}
                    <button onClick={onClose} className="khqr-close-btn">{lang === 'kh' ? 'បិទ' : 'Close'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceModal;
