import React, { useState, useEffect } from 'react';

const CambodiaAddress = ({ value, onChange, lang }) => {
  // Parse existing value or init empty
  const [houseStreet, setHouseStreet] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [communeId, setCommuneId] = useState('');
  const [villageId, setVillageId] = useState('');

  // 🚀 Lazy-load the 897KB geo dataset only when this component mounts
  const [geoData, setGeoData] = useState([]);
  useEffect(() => {
    import('../../data/cambodia.json').then(m => setGeoData(m.default || m));
  }, []);

  // Dropdown lists
  const provinces = geoData;
  const [districts, setDistricts] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [villages, setVillages] = useState([]);


  // Initialize from value prop if available
  useEffect(() => {
    if (value && typeof value === 'string') {
      const parts = value.split(',').map(p => p.trim());
      if (parts.length > 0) setHouseStreet(parts[0]);
      // If we wanted to accurately reverse-map the string to IDs, we would search geoData.
      // For simplicity in this implementation, we just set the house/street part 
      // if it's already a saved string without IDs.
    }
  }, [value]);

  // Update lists when selections change
  useEffect(() => {
    if (provinceId) {
      const p = provinces.find(x => x.code === provinceId);
      setDistricts(p ? p.districts || [] : []);
      setDistrictId('');
      setCommuneId('');
      setVillageId('');
    } else {
      setDistricts([]);
    }
  }, [provinceId]);

  useEffect(() => {
    if (districtId) {
      const d = districts.find(x => x.code === districtId);
      setCommunes(d ? d.communes || [] : []);
      setCommuneId('');
      setVillageId('');
    } else {
      setCommunes([]);
    }
  }, [districtId]);

  useEffect(() => {
    if (communeId) {
      const c = communes.find(x => x.code === communeId);
      setVillages(c ? c.villages || [] : []);
      setVillageId('');
    } else {
      setVillages([]);
    }
  }, [communeId]);

  // Trigger onChange when any part changes
  useEffect(() => {
    let fullAddress = houseStreet;
    
    if (villageId) {
      const v = villages.find(x => x.code === villageId);
      if (v) fullAddress += `, ${lang === 'kh' ? v.khmer : v.latin}`;
    }
    
    if (communeId) {
      const c = communes.find(x => x.code === communeId);
      if (c) fullAddress += `, ${lang === 'kh' ? c.khmer : c.latin}`;
    }

    if (districtId) {
      const d = districts.find(x => x.code === districtId);
      if (d) fullAddress += `, ${lang === 'kh' ? d.khmer : d.latin}`;
    }

    if (provinceId) {
      const p = provinces.find(x => x.code === provinceId);
      if (p) fullAddress += `, ${lang === 'kh' ? p.khmer : p.latin}`;
    }

    // Fire onChange whenever the computed address differs from current prop
    if (fullAddress.trim() !== (value || '').trim()) {
      onChange(fullAddress.trim().replace(/^,\s*/, '')); // clean leading comma if house is empty
    }
  }, [houseStreet, provinceId, districtId, communeId, villageId, lang]);

  return (
    <div className="flex flex-col gap-2.5">
      
      {/* House & Street */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 900, opacity: 0.7, marginBottom: 5, display: 'block' }}>
          {lang === 'kh' ? 'លេខផ្ទះ ផ្លូវ' : 'House / Street No.'}
        </label>
        <input
          type="text"
          className="input-glass-admin cambodia-address-input"
          value={houseStreet}
          onChange={e => setHouseStreet(e.target.value)}
          placeholder={lang === 'kh' ? 'ផ្ទះលេខ 12A, ផ្លូវ 2004...' : 'House 12A, St 2004...'}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Province */}
        <div>
          <label className="text-[11px] font-black opacity-70 mb-1.5 block">
            {lang === 'kh' ? 'រាជធានី/ខេត្ត' : 'Province'}
          </label>
          <select
            className="input-glass-admin cambodia-address-select"
            value={provinceId}
            onChange={e => setProvinceId(e.target.value)}
          >
            <option value="">{lang === 'kh' ? '-- រើសខេត្ត --' : '-- Select Province --'}</option>
            {provinces.map(p => (
              <option key={p.code} value={p.code}>{lang === 'kh' ? p.khmer : p.latin}</option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="text-[11px] font-black opacity-70 mb-1.5 block">
            {lang === 'kh' ? 'ស្រុក/ខណ្ឌ' : 'District'}
          </label>
          <select
            className="input-glass-admin cambodia-address-select"
            value={districtId}
            onChange={e => setDistrictId(e.target.value)}
            disabled={!provinceId}
          >
            <option value="">{lang === 'kh' ? '-- រើសស្រុក --' : '-- Select District --'}</option>
            {districts.map(d => (
              <option key={d.code} value={d.code}>{lang === 'kh' ? d.khmer : d.latin}</option>
            ))}
          </select>
        </div>

        {/* Commune */}
        <div>
          <label className="text-[11px] font-black opacity-70 mb-1.5 block">
            {lang === 'kh' ? 'ឃុំ/សង្កាត់' : 'Commune'}
          </label>
          <select
            className="input-glass-admin cambodia-address-select"
            value={communeId}
            onChange={e => setCommuneId(e.target.value)}
            disabled={!districtId}
          >
            <option value="">{lang === 'kh' ? '-- រើសឃុំ --' : '-- Select Commune --'}</option>
            {communes.map(c => (
              <option key={c.code} value={c.code}>{lang === 'kh' ? c.khmer : c.latin}</option>
            ))}
          </select>
        </div>

        {/* Village */}
        <div>
          <label className="text-[11px] font-black opacity-70 mb-1.5 block">
            {lang === 'kh' ? 'ភូមិ' : 'Village'}
          </label>
          <select
            className="input-glass-admin cambodia-address-select"
            value={villageId}
            onChange={e => setVillageId(e.target.value)}
            disabled={!communeId || villages.length === 0}
          >
            <option value="">{lang === 'kh' ? '-- រើសភូមិ --' : '-- Select Village --'}</option>
            {villages.map(v => (
              <option key={v.code} value={v.code}>{lang === 'kh' ? v.khmer : v.latin}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CambodiaAddress;
