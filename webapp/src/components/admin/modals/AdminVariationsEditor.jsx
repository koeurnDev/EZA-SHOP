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

  return (
    <div style={{ marginBottom: 16, padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>
          👕 {lang === 'kh' ? 'ជម្រើសទំហំ និង ពណ៌ (Variations)' : 'Size & Color Variations'}
        </label>
        <button 
          onClick={handleAddVariant}
          style={{ background: 'var(--primary-accent)', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: 11, fontWeight: 'bold' }}
        >
          + {lang === 'kh' ? 'បន្ថែម' : 'Add'}
        </button>
      </div>

      {variants.length === 0 ? (
        <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', padding: '10px 0' }}>
          {lang === 'kh' ? 'មិនមានជម្រើស (ប្រើចំនួនទំនិញទូទៅ)' : 'No variations (using general stock)'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {variants.map((v, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
              <input 
                placeholder="Color (e.g. Red)" 
                value={v.color} 
                onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12 }}
              />
              <input 
                placeholder="Size (e.g. M)" 
                value={v.size} 
                onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12 }}
              />
              <input 
                type="number"
                placeholder="Stock" 
                value={v.stock} 
                onChange={(e) => handleUpdateVariant(idx, 'stock', parseInt(e.target.value) || 0)}
                style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12 }}
              />
              <button 
                onClick={() => handleRemoveVariant(idx)}
                style={{ background: 'transparent', color: '#ff4d4f', border: 'none', padding: '4px', fontSize: 14, cursor: 'pointer' }}
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
