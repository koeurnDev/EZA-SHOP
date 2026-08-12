import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';

// 🖤 Shared Charcoal Dropdown — React.memo + ARIA + keyboard nav
const DarkSelect = React.memo(({ value, onChange, options, style = {}, placeholder, selectedLabel, triggerStyle = {}, triggerClassName = '', menuClassName = '' }) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const ref = useRef(null);
  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);
  const displayLabel = selected?.label || selectedLabel || placeholder || 'រើស...';
  const isFormTrigger = triggerClassName.includes('admin-form-select-trigger');

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) setHoveredValue(null);
  }, [open]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDropUp(window.innerHeight - rect.bottom < 230);
  }, [open]);

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
        className={[
          'admin-dark-select-trigger',
          open ? 'admin-dark-select-trigger--open' : '',
          triggerClassName
        ].filter(Boolean).join(' ')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          ...(isFormTrigger ? {} : {
            background: 'var(--bg-soft)',
            fontSize: 11,
            fontWeight: 900,
            padding: '6px 10px',
            borderRadius: 10,
            minHeight: 34
          }),
          ...triggerStyle
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <span style={{ marginLeft: 8, opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="dropdown options"
          onMouseLeave={() => setHoveredValue(null)}
          className={['admin-dark-select-menu', menuClassName].filter(Boolean).join(' ')}
          style={{
            listStyle: 'none', margin: 0, padding: isFormTrigger ? undefined : 4,
            position: 'absolute',
            ...(dropUp ? { bottom: 'calc(100% + 6px)', top: 'auto' } : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            left: 0, right: 0, zIndex: 9999,
            ...(isFormTrigger ? {} : {
              background: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              overflowY: 'auto',
              overflowX: 'hidden',
              maxHeight: 220,
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)'
            })
          }}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            const isHovered = hoveredValue === opt.value && !isSelected;
            return (
            <li
              key={opt.value}
              role="option"
              aria-selected={isSelected}
              onClick={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              onMouseEnter={() => setHoveredValue(opt.value)}
              className={[
                'admin-dark-select-option',
                isSelected ? 'admin-dark-select-option--selected' : '',
                isHovered ? 'admin-dark-select-option--hover' : ''
              ].filter(Boolean).join(' ')}
            >
              {opt.label}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

export default DarkSelect;
