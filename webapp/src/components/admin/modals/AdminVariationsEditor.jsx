import React from 'react';
import { useUser } from '../../../context/UserContext';

const AdminVariationsEditor = ({ variants = [], setVariants }) => {
  const { t, lang } = useUser();

  const handleAddVariant = () => {
    setVariants([...variants, { color: '', size: '', stock: 0 }]);
  };

  const handleRemoveVariant = (index) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    setVariants(newVariants);
  };

  const handleUpdateVariant = (index, field, value) => {
    const newVariants = [...variants];
    newVariants[index][field] = value;
    setVariants(newVariants);
  };

  const addQuickSize = (sizeVal) => {
    setVariants([...variants, { color: '', size: sizeVal, stock: 10 }]);
  };

  return (
    <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>
          👕 {lang === 'kh' ? 'ជម្រើសទំហំ, ពណ៌ និង ស្តុក (Variations)' : 'Size & Color Variations'}
        </label>
        <button 
          onClick={handleAddVariant}
          style={{ background: 'var(--primary-gradient)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}
        >
          + {lang === 'kh' ? 'បន្ថែមជួរ' : 'Add Row'}
        </button>
      </div>

      {/* ⚡ Quick Preset Size Chips for Staff */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, marginBottom: 5 }}>
          ⚡ {lang === 'kh' ? 'ចុចថែម Size លឿន (Quick Add Size):' : 'Quick Add Size:'}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['S', 'M', 'L', 'XL', '2XL', '38', '39', '40', '41', '42', '43'].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => addQuickSize(sz)}
              style={{
                fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                background: 'var(--bg-soft, rgba(255,255,255,0.08))',
                color: 'var(--text-bold, #fff)', cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              + {sz}
            </button>
          ))}
        </div>
      </div>

      {variants.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', padding: '10px 0' }}>
          {lang === 'kh' ? 'មិនមានជម្រើស (ប្រើចំនួនទំនិញទូទៅ)' : 'No variations (using general stock)'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {variants.map((v, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '10px', width: '100%', boxSizing: 'border-box' }}>
              <input 
                placeholder={lang === 'kh' ? "ពណ៌ (ឧ. ក្រហម)" : "Color (e.g. Red)"} 
                value={v.color || ''} 
                onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                style={{ flex: '1 1 0%', minWidth: 0, padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', background: 'var(--bg-soft, rgba(255,255,255,0.05))', color: 'var(--text-bold, #fff)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
              />
              <input 
                placeholder={lang === 'kh' ? "ទំហំ (ឧ. M, 39)" : "Size (e.g. M, 39)"} 
                value={v.size || ''} 
                onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                style={{ flex: '1 1 0%', minWidth: 0, padding: '7px 8px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', background: 'var(--bg-soft, rgba(255,255,255,0.05))', color: 'var(--text-bold, #fff)', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
              />
              <input 
                type="number"
                placeholder={lang === 'kh' ? "ស្តុក" : "Stock"} 
                value={v.stock} 
                onChange={(e) => handleUpdateVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                style={{ width: '56px', padding: '7px 6px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', background: 'var(--bg-soft, rgba(255,255,255,0.05))', color: '#10b981', fontSize: 12, fontWeight: 900, textAlign: 'center', flexShrink: 0, boxSizing: 'border-box', outline: 'none' }}
              />
              <button 
                type="button"
                onClick={() => handleRemoveVariant(idx)}
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVariationsEditor;
