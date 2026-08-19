import React, { useState } from 'react';
import CambodiaAddress from './ui/CambodiaAddress';

const DeliveryForm = ({ formData, setFormData, onPhoneChange, t, lang, validationErrors = {} }) => {
  const [imgErrors, setImgErrors] = useState({ jt: false, vet: false });
  const provinces = [
    'Phnom Penh', 'Siem Reap', 'Preah Sihanouk', 'Battambang', 'Kampot', 
    'Kep', 'Kandal', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu', 
    'Kampong Thom', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 
    'Pailin', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri', 
    'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'
  ];

  return (
    <div className="delivery-form-container animate-in">
      {/* 👤 Buyer Information Section */}
      <div className="form-section-luxury">
        <h3 className="section-title-clean">{t('buyer_info')}</h3>
        
        <div className="input-group-luxury">
          <label className="input-label-luxury">
            {t('name_label')} <span className="text-red-500">*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             <input 
               type="text" 
               className="input-glass" 
               placeholder={lang === 'kh' ? 'ឧទាហរណ៍: John Doe' : 'Ex: John Doe'} 
               value={formData.name}
               onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
             />
          </div>
        </div>

          <div className="input-group-luxury mt-[15px]">
          <label className="input-label-luxury">
             {t('phone_label')} <span className="text-red-500">*</span>
          </label>
          <div className="input-with-icon">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.81 12.81 0 0 0 .62 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.62A2 2 0 0 1 22 16.92z"></path></svg>
             <input 
               type="tel" 
               className={`input-glass ${validationErrors.phone ? 'input-error-shake' : ''}`} 
               placeholder={lang === 'kh' ? 'ឧទាហរណ៍: 012 345 678' : 'Ex: 012 345 678'} 
               value={formData.phone}
               onChange={(e) => onPhoneChange(e.target.value)}
             />
          </div>
        </div>
      </div>

      {/* 🚚 Delivery Information Section */}
      <div className="form-section-luxury mt-[30px]">
        <div className="flex flex-col gap-[15px] mb-5">
           <h3 className="section-title-clean m-0">
              {lang === 'kh' ? 'ដឹកជញ្ជូនតាម (Ship Via)' : 'ដឹកជញ្ជូនតាម (Ship Via)'}
           </h3>
           
           <div className="carrier-selection-grid">
              <div 
                className={`carrier-option-card ${formData.deliveryCompany === 'j&t' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, deliveryCompany: 'j&t' }))}
              >
                 <div className="carrier-check">{formData.deliveryCompany === 'j&t' ? '✓' : ''}</div>
                 {!imgErrors.jt ? (
                    <img 
                      src="/jt.png" 
                      alt="J&T" 
                      className="carrier-logo-img" 
                      onError={() => setImgErrors(prev => ({ ...prev, jt: true }))}
                    />
                 ) : (
                    <div className="jt-logo-fallback">
                       <span className="text-[#ff2c00] font-black">J</span>
                       <span className="text-[var(--text-bold)] font-black">&</span>
                       <span className="text-[#ff2c00] font-black">T</span>
                    </div>
                 )}
              </div>

              <div 
                className={`carrier-option-card ${formData.deliveryCompany === 'vet' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, deliveryCompany: 'vet' }))}
              >
                 <div className="carrier-check">{formData.deliveryCompany === 'vet' ? '✓' : ''}</div>
                 {!imgErrors.vet ? (
                    <img 
                      src="/vet.png" 
                      alt="VET" 
                      className="carrier-logo-img" 
                      onError={() => setImgErrors(prev => ({ ...prev, vet: true }))}
                    />
                 ) : (
                    <div className="vet-logo-fallback">
                       <span className="vet-fallback-v">V</span>
                       <span className="vet-fallback-e">E</span>
                       <span className="vet-fallback-t">T</span>
                    </div>
                 )}
              </div>

              <div 
                className={`carrier-option-card ${formData.deliveryCompany === 'grab' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, deliveryCompany: 'grab' }))}
              >
                 <div className="carrier-check">{formData.deliveryCompany === 'grab' ? '✓' : ''}</div>
                 <div className="vet-logo-fallback bg-[#00b14f] text-white rounded-lg px-2 py-1 font-black text-[12px]">
                    🛵 Grab
                 </div>
              </div>
           </div>
        </div>

        <div className="input-group-luxury">
          <CambodiaAddress 
            value={formData.address}
            onChange={(val) => setFormData(prev => ({ ...prev, address: val, province: '' }))} // Clear province since address contains it now
            lang={lang}
          />
        </div>

          <div className="input-group-luxury mt-[15px]">
          <label className="input-label-luxury">
             {t('note_label')}
          </label>
          <textarea 
            className="input-glass h-[80px] pt-3 text-[var(--text-main)] bg-[var(--bg-surface)]" 
            placeholder="..." 
            value={formData.note}
            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
};

export default DeliveryForm;
