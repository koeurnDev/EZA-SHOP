import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { useTelegram } from '../context/TelegramContext';

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
const InvoiceModal = ({ order, onClose, paymentQrUrl, paymentInfo, BACKEND_URL, onPaymentSuccess, t, lang }) => {
  const { switchInlineQuery, showAlert } = useTelegram();
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
  
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const receiptRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

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
    if (order) setLocalOrder(order);
  }, [order]);

  if (!localOrder) return null;

  const isDraft = localOrder.id === 'DRAFT';
  const displayId = isDraft ? '...' : (localOrder.order_code || String(localOrder.id));
  const dbId = localOrder.id;
  const items = React.useMemo(() => typeof localOrder.items === 'string' ? JSON.parse(localOrder.items) : localOrder.items, [localOrder.items]);

  const orderStatus = localOrder.status;

  // 🕒 SERVER-SYNCED TIMER: Direct sync with Server's expires_in
  useEffect(() => {
    if (orderStatus === 'paid' || isExpired) return;

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
  // [DISABLED BY REQUEST - MANUAL CHECK INSTEAD]
  useEffect(() => {
    /*
    if (orderStatus === 'paid' || isExpired || isDraft) return;

    const currentDelay = attempts < 10 ? 500 : attempts < 20 ? 1000 : attempts < 40 ? 3000 : 10000;

    const interval = setTimeout(async () => {
      const tgData = window.Telegram?.WebApp?.initData || '';
      
      try {
        const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
          headers: { 'X-TG-Data': tgData }
        });
        const data = await res.json();
        
        setIsOffline(false);
        setAttempts(prev => prev + 1);

        if (data.success) {
          setLocalOrder(data.order);
          if (data.status === 'paid') {
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
    */
  }, [localOrder.order_code, orderStatus, attempts, BACKEND_URL, onPaymentSuccess, isExpired]);

  const handleRefreshQR = async () => {
    setIsVerifying(true);
    const tgData = window.Telegram?.WebApp?.initData || '';
    try {
      // Polling status triggers a self-healing refresh on the server if it's stale
      const res = await fetch(`${BACKEND_URL}/api/orders/status/${localOrder.order_code}`, {
        headers: { 'X-TG-Data': tgData }
      });
      const data = await res.json();
      if (data.success) {
        setLocalOrder(data.order);
        setIsExpired(false);
        setAttempts(0);
        if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram?.WebApp?.HapticFeedback.impactOccurred('medium');
      }
    } catch (err) {
      console.error("Refresh Fail:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const renderReceipt = () => (
    <div className="receipt-luxury-paper animate-up" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Receipt Content to Save ── */}
      <div ref={receiptRef} style={{ background: '#fff', padding: '0 0 14px 0' }}>
        {/* ── HEADER ── */}
        <div style={{ textAlign: 'center', padding: '20px 18px 14px', borderBottom: '1px dashed var(--border-color)' }}>
        <div style={{ display: 'inline-block', padding: 6, background: 'var(--bg-soft)', borderRadius: 16, marginBottom: 8 }}>
          <img src={logoDataUrl || "/favicon.png"} alt="MO MO" crossOrigin="anonymous" style={{ width: 44, height: 44, borderRadius: 10, display: 'block' }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-bold)', letterSpacing: 2 }}>MO MO BOUTIQUE</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>
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

      <div style={{ padding: '14px 18px' }}>

        {/* ── TOTAL ── */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>{t('final_total')}</div>
          <div style={{ fontSize: 36, fontWeight: 950, color: '#d4af37', lineHeight: 1 }}>${parseFloat(localOrder.total).toFixed(2)}</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 10, fontWeight: 900, padding: '3px 12px', borderRadius: 100 }}>
              ✓ {lang === 'kh' ? 'ការបញ្ជាទិញបានបញ្ជាក់' : 'Confirmed'}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />

        {/* ── CUSTOMER INFO ── */}
        {[
          { label: lang === 'kh' ? 'អតិថិជន' : 'Customer', value: localOrder.user_name || 'Guest' },
          { label: lang === 'kh' ? 'ទូរស័ព្ទ' : 'Phone', value: localOrder.phone || '—' },
          { label: lang === 'kh' ? 'អាសយដ្ឋាន' : 'Address', value: `${localOrder.address || ''}${localOrder.province ? ', ' + localOrder.province : ''}` },
          localOrder.delivery_company ? { label: lang === 'kh' ? 'ក្រុមហ៊ុនដឹក' : 'Courier', value: `🚚 ${localOrder.delivery_company}` } : null,
        ].filter(Boolean).map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>{row.label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-bold)', textAlign: 'right', wordBreak: 'break-word', maxWidth: '62%' }}>{row.value}</span>
          </div>
        ))}

        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />

        {/* ── ORDER STATUS TRACKER ── */}
        {(() => {
          const steps = [
            { key: 'paid',       icon: '✓',  label: lang === 'kh' ? 'បង់រួច'            : 'Paid'    },
            { key: 'processing', icon: '✓',  label: lang === 'kh' ? 'រៀបចំ'             : 'Packing' },
            { key: 'delivering', icon: '🚚', label: lang === 'kh' ? 'ប្រគល់ឲ្យអ្នកដឹក' : 'Courier' },
          ];
          const order = ['paid', 'processing', 'delivering'];
          const norm = (orderStatus === 'shipped' || orderStatus === 'delivered') ? 'delivering' : orderStatus;
          const currentIdx = order.indexOf(norm);
          return (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 0 8px' }}>
              {/* background connector line spanning full width */}
              <div style={{ position: 'absolute', top: 16, left: '13%', right: '13%', height: 2, background: 'var(--border-subtle)', zIndex: 0 }} />
              {/* gold connector — spans done segments */}
              {currentIdx > 0 && (
                <div style={{
                  position: 'absolute', top: 16, left: '13%', height: 2, zIndex: 0,
                  width: currentIdx >= steps.length - 1 ? '74%' : currentIdx === 1 ? '37%' : '0%',
                  background: '#d4af37', transition: 'width 0.4s ease',
                }} />
              )}
              {steps.map((step, i) => {
                const stepIdx = i;
                const isDone    = currentIdx > stepIdx;
                const isCurrent = currentIdx === stepIdx;
                const isActive  = isDone || isCurrent;
                return (
                  <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, zIndex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isCurrent ? '#d4af37' : isDone ? 'rgba(212,175,55,0.18)' : 'var(--bg-soft)',
                      border: `2px solid ${isActive ? '#d4af37' : 'var(--border-subtle)'}`,
                      fontSize: isCurrent ? 12 : 11, fontWeight: 900,
                      color: isCurrent ? 'white' : isActive ? '#d4af37' : 'var(--text-muted)',
                      boxShadow: isCurrent ? '0 2px 8px rgba(212,175,55,0.4)' : 'none',
                      flexShrink: 0,
                    }}>
                      {step.icon}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: isActive ? '#d4af37' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, maxWidth: 64, wordBreak: 'break-word' }}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />

        {/* ── ITEMS ── */}
        {items && items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-bold)', flex: 1 }}>
              {item.name} <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>×{item.quantity}</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 900 }}>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}

        {/* ── PRICE BOX ── */}
        <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '8px 12px', marginTop: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'kh' ? 'សរុបដើម' : 'Subtotal'}</span>
            <span style={{ fontSize: 11, fontWeight: 800 }}>${parseFloat(localOrder.subtotal || localOrder.total).toFixed(2)}</span>
          </div>
          {parseFloat(localOrder.discount_amount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#ef4444' }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{lang === 'kh' ? 'បញ្ចុះតម្លៃ' : 'Discount'}</span>
              <span style={{ fontSize: 11, fontWeight: 800 }}>-${parseFloat(localOrder.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{lang === 'kh' ? 'ថ្លៃដឹក' : 'Delivery'}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>{parseFloat(localOrder.delivery_fee) === 0 ? (lang === 'kh' ? 'ឥតគិតថ្លៃ' : 'Free') : `$${parseFloat(localOrder.delivery_fee).toFixed(2)}`}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 13, fontWeight: 950, color: 'var(--text-bold)' }}>{t('final_total')}</span>
            <span style={{ fontSize: 15, fontWeight: 950, color: '#d4af37' }}>${parseFloat(localOrder.total).toFixed(2)}</span>
          </div>
        </div>

        {/* ── REF NUMBER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212,175,55,0.06)', border: '1px dashed #d4af37', borderRadius: 8, padding: '7px 12px', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{lang === 'kh' ? 'លេខកូដ' : 'Ref #'}</span>
          <span style={{ fontSize: 13, fontWeight: 950, color: '#d4af37', fontFamily: 'monospace', letterSpacing: 1.5 }}>
            {isDraft ? '...' : (localOrder.order_code || String(localOrder.id))}
          </span>
        </div>

        {/* ── QR CODE ── */}
        {miniQrUrl && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ display: 'inline-block', background: 'white', padding: 8, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <img src={miniQrUrl} alt="QR" style={{ width: 80, height: 80, display: 'block', borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5 }}>
              {lang === 'kh' ? 'ស្កេនដើម្បីផ្ទៀងផ្ទាត់' : 'Scan to Verify'}
            </div>
          </div>
        )}

        {/* ── END OF RECEIPT CONTENT ── */}
        </div>
      </div>

      {/* ── BUTTONS (Excluded from saved image) ── */}
      <div style={{ display: 'flex', gap: 8, padding: '0 18px 14px 18px' }}>
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
          className="detail-btn-cart-luxury"
          style={{ flex: 1, height: 42, fontSize: 12, borderRadius: 10, opacity: isSaving ? 0.7 : 1 }}>
          {isSaving ? '⌛...' : `📥 ${lang === 'kh' ? 'រក្សាទុក' : 'Save'}`}
        </button>
        <button
          onClick={onClose}
          className="detail-btn-cart-luxury"
          style={{ flex: 1, height: 42, borderRadius: 10, fontSize: 12, background: 'var(--bg-soft)', color: 'var(--text-bold)', boxShadow: 'none', border: '1.5px solid var(--border-color)' }}>
          {lang === 'kh' ? 'បិទ' : 'Close'}
        </button>
      </div>

    </div>
  );

  return (
    <div className="modal-overlay" style={{ backgroundColor: 'var(--glass-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px' }}>

        {isExpired ? (
          <div className="order-card-luxury animate-in" style={{ padding: '60px 30px 40px', textAlign: 'center', borderColor: '#fee2e2' }}>
            <div style={{ fontSize: '70px', marginBottom: '25px' }}>⏳</div>
            <h2 style={{ fontSize: '24px', fontWeight: '950', color: 'var(--text-bold)', marginBottom: '12px' }}>{lang === 'kh' ? 'ការកុម្ម៉ង់ហួសពេល' : 'Order Expired'}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: 40 }}>{lang === 'kh' ? 'សុំទោស! រយៈពេលបង់ប្រាក់ ៥ នាទីត្រូវបានបញ្ជប់។ សូមសាកល្បងម្តងទៀត។' : 'Sorry! The 5-minute payment window has closed. Please try again.'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={handleRefreshQR} className="detail-btn-buy-luxury" disabled={isVerifying}>
                {isVerifying ? '...' : (lang === 'kh' ? '🔄 ធ្វើឱ្យ QR ថ្មី' : '🔄 Refresh QR')}
              </button>
              <button onClick={onClose} className="back-btn-pill" style={{ opacity: 0.7 }}>{t('close')}</button>
            </div>
          </div>
        ) : (orderStatus === 'paid' || orderStatus === 'processing' || orderStatus === 'shipped' || orderStatus === 'delivering' || orderStatus === 'delivered') ? (
          renderReceipt()
        ) : (
          <div className="khqr-premium-box animate-up">
            <div className="khqr-terminal-header"></div>
            <div className="khqr-brand-tag">KHQR</div>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <div className="order-id-lux" style={{ letterSpacing: 2 }}>MO MO BOUTIQUE</div>
              <div className="khqr-amount-lux" style={{ color: '#111' }}>${parseFloat(localOrder.total).toFixed(2)}</div>

              {/* 📍 Quick Verification Info */}
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 20, background: 'var(--bg-soft)', display: 'inline-block', padding: '6px 16px', borderRadius: '100px' }}>
                {localOrder.user_name} • {localOrder.phone}
              </div>

              {isDraft ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>⏳</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-bold)', marginBottom: '8px' }}>{lang === 'kh' ? 'កំពុងរៀបចំការកម្ម៉ង់...' : 'Preparing Order...'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{lang === 'kh' ? 'សូមរង់ចាំបន្តិច ពេលកំពុងភ្ជាប់ទៅកាន់ប្រព័ន្ធ...' : 'Please wait while we connect to the system...'}</div>
                </div>
              ) : (
                <>
                  {!receiptUploaded ? (
                    <>
                      <div className="qr-code-wrapper-lux">
                        {dynamicQr ? (
                          <img src={dynamicQr} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : paymentQrUrl ? (
                          <img src={paymentQrUrl} alt="KHQR" onContextMenu={(e) => e.preventDefault()} />
                        ) : (
                          <div style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <div className="animate-in" style={{ textAlign: 'center', padding: '15px' }}>
                              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏦</div>
                              <div style={{ fontSize: '12px', fontWeight: '950', color: 'var(--text-bold)', textTransform: 'uppercase', marginBottom: '8px' }}>{lang === 'kh' ? 'ព័ត៌មានបង់ប្រាក់' : 'Payment Details'}</div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-soft)', padding: '10px', borderRadius: '12px', wordBreak: 'break-all' }}>
                                {paymentInfo || 'ABA / ABA KHQR'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: timeLeft < 60 ? '#ef4444' : 'var(--text-muted)', fontWeight: 950, fontSize: 18, marginBottom: 8 }}>
                        <span style={{ opacity: 0.6 }}>⏳</span>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </>
                  ) : (
                    <div className="animate-in" style={{ marginBottom: 20, textAlign: 'left', background: 'var(--bg-soft)', borderRadius: 16, padding: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 10, color: 'var(--text-bold)' }}>
                        {lang === 'kh' ? '🛍️ សេចក្តីសង្ខេបការកម្ម៉ង់' : '🛍️ Order Summary'}
                      </div>
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {items?.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: 'var(--text-bold)' }}>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span>{item.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {item.selectedSize && `Size: ${item.selectedSize} | `}
                                {item.selectedColor && `Color: ${item.selectedColor} | `}
                                Qty: {item.quantity}
                              </span>
                            </span>
                            <span style={{ fontWeight: 800 }}>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(0,0,0,0.1)', fontSize: 16, fontWeight: 900, color: 'var(--text-bold)' }}>
                        <span>{lang === 'kh' ? 'សរុប' : 'Total'}</span>
                        <span style={{ color: '#111' }}>${localOrder.total?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  )}

                  {/* 🔍 Manual Check Instructions */}
                  {!receiptUploaded ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-bold)', fontWeight: 900, marginBottom: 16, textAlign: 'center', lineHeight: 1.5, background: 'var(--bg-soft)', padding: 12, borderRadius: 12 }}>
                      {lang === 'kh' ? 'សូមស្កេនបង់ប្រាក់ រួចថតអេក្រង់ (Screenshot) ផ្ញើទៅកាន់ Admin ដើម្បីបញ្ជាក់ការកម្ម៉ង់។' : 'Please scan to pay and send the screenshot to Admin to confirm.'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 900, marginBottom: 16, textAlign: 'center', lineHeight: 1.5, background: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 12 }}>
                      {lang === 'kh' ? '✅ ទទួលបានជោគជ័យ! អរគុណសម្រាប់ការបង់ប្រាក់។ ក្រុមការងារយើងខ្ញុំកំពុងពិនិត្យ និងរៀបចំការកម្ម៉ង់ជូនលោកអ្នក។' : '✅ Received Successfully! Thank you for your payment. Our team is verifying and preparing your order.'}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!receiptUploaded && (
                      <label className={`detail-btn-buy-luxury`} style={{ width: '100%', height: 48, borderRadius: 16, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', cursor: 'pointer', background: 'var(--primary-gradient)' }}>
                        {isUploadingReceipt ? (lang === 'kh' ? '⌛ កំពុងផ្ទុក...' : '⌛ Uploading...') : (lang === 'kh' ? '📤 ដាក់វិក្កយបត្របញ្ជាក់ទីនេះ' : 'Upload Receipt Here')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingReceipt || receiptUploaded} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // 🚀 Optimistic UI: Immediately show success
                            setIsUploadingReceipt(true);
                            setReceiptUploaded(true);

                            const fd = new FormData();
                            fd.append('image', file); // using 'image' as expected by multer

                            // Perform upload asynchronously without blocking the UI
                            (async () => {
                              try {
                                const tgData = window.Telegram?.WebApp?.initData || '';
                                const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', headers: { 'X-TG-Data': tgData }, body: fd });
                                const data = await res.json();
                                if (data.success) {
                                  // Link to order
                                  await fetch(`${BACKEND_URL}/api/orders/receipt`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'X-TG-Data': tgData },
                                    body: JSON.stringify({ orderCode: localOrder.order_code, receiptUrl: data.url })
                                  });
                                } else {
                                  // 🔄 Rollback if failed
                                  setReceiptUploaded(false);
                                  alert(lang === 'kh' ? 'មានបញ្ហាក្នុងការផ្ទុករូបភាព' : 'Upload failed');
                                }
                              } catch (err) {
                                console.error(err);
                                // 🔄 Rollback if failed
                                setReceiptUploaded(false);
                                alert(lang === 'kh' ? 'មានបញ្ហាបណ្តាញទាក់ទង' : 'Network Error');
                              } finally {
                                setIsUploadingReceipt(false);
                              }
                            })();
                          }
                        }} />
                      </label>
                    )}
                    <button onClick={onClose} className="back-btn-pill" style={{ width: '100%', height: 48, borderRadius: 16, fontWeight: 'bold', background: 'var(--bg-soft)', color: 'var(--text-bold)', fontSize: 14, border: 'none', cursor: 'pointer' }}>{lang === 'kh' ? 'បិទ' : 'Close'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .dot-pulse { width: 6px; height: 6px; border-radius: 50%; background-color: var(--primary-accent); position: relative; }
        .dot-pulse::after { content: ''; position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: inherit; animation: dotPulse 1.5s ease-out infinite; }
        @keyframes dotPulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
