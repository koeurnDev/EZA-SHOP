import React, { useMemo } from 'react';
import { useUser } from '../../../context/UserContext';
import {
  getVariantUnitMode,
  getQuickPresets,
  getVariantPanelMeta
} from '../../../utils/variantUnitUtils';

const AdminVariationsEditor = ({ variants = [], setVariants, category = '', productName = '' }) => {
  const { lang } = useUser();

  const unitMode = useMemo(
    () => getVariantUnitMode({
      category,
      productName,
      variantSizes: variants.map((variant) => variant.size).filter(Boolean)
    }),
    [category, productName, variants]
  );

  const panelMeta = getVariantPanelMeta(lang, unitMode);
  const quickPresets = getQuickPresets(unitMode);

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
    <div className="admin-variations-panel">
      <div className="admin-variations-header">
        <label className="admin-variations-title">
          {panelMeta.icon} {lang === 'kh' ? panelMeta.titleKh : panelMeta.titleEn}
        </label>
        <button type="button" className="admin-variations-add-btn" onClick={handleAddVariant}>
          + {lang === 'kh' ? 'បន្ថែមជួរ' : 'Add Row'}
        </button>
      </div>

      <div className="admin-variations-quick">
        <div className="admin-variations-quick-label">
          ⚡ {lang === 'kh' ? panelMeta.quickKh : panelMeta.quickEn}
        </div>
        <div className="admin-variations-quick-row">
          {quickPresets.map((preset) => (
            <button key={preset} type="button" className="admin-variations-quick-chip" onClick={() => addQuickSize(preset)}>
              + {preset}
            </button>
          ))}
        </div>
      </div>

      {variants.length === 0 ? (
        <div className="admin-variations-empty">
          {lang === 'kh' ? 'មិនមានជម្រើស (ប្រើចំនួនទំនិញទូទៅ)' : 'No variations (using general stock)'}
        </div>
      ) : (
        <div className="admin-variations-list">
          {variants.map((v, idx) => (
            <div key={idx} className="admin-variations-row">
              <input
                className="admin-variations-field admin-variations-field--text"
                placeholder={lang === 'kh' ? 'ពណ៌ (ឧ. ក្រហម)' : 'Color (e.g. Red)'}
                value={v.color || ''}
                onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
              />
              <input
                className="admin-variations-field admin-variations-field--text"
                placeholder={lang === 'kh' ? panelMeta.placeholderKh : panelMeta.placeholderEn}
                value={v.size || ''}
                onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value)}
              />
              <input
                type="number"
                min="0"
                className="admin-variations-field admin-variations-field--stock"
                placeholder={lang === 'kh' ? 'ស្តុក' : '0'}
                value={v.stock ?? 0}
                onChange={(e) => handleUpdateVariant(idx, 'stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <button type="button" className="admin-variations-remove" onClick={() => handleRemoveVariant(idx)} aria-label="Remove row">
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
