import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

// 🖤 Shared Charcoal Dropdown — React.memo + ARIA + keyboard nav
const DarkSelect = React.memo(({ value, onChange, options, style = {}, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
    if (e.key === 'ArrowDown' && open) {
      const idx = options.findIndex(o => o.value === value);
      if (idx < options.length - 1) onChange(options[idx + 1].value);
    }
    if (e.key === 'ArrowUp' && open) {
      const idx = options.findIndex(o => o.value === value);
      if (idx > 0) onChange(options[idx - 1].value);
    }
  }, [open, options, value, onChange]);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(o => !o)}
        className="input-glass-admin"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', background: 'var(--bg-soft)' }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : (placeholder || 'រើស...')}
        </span>
        <span style={{ marginLeft: 8, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="dropdown options"
          style={{
            listStyle: 'none', margin: 0, padding: 0,
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999,
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14, overflow: 'auto', maxHeight: 220,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)'
          }}
        >
          {options.map(opt => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                background: opt.value === value ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: '#f8fafc',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = opt.value === value ? 'rgba(255,255,255,0.12)' : 'transparent'}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default DarkSelect;
