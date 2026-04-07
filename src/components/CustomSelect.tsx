/**
 * CustomSelect.tsx
 * Dropdown estilizado con el tema dark de la app. Reemplaza los <select> nativos.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = '',
  placeholder,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? value;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-black/20 border rounded-xl px-3 py-3
          text-sm text-[#F0EAD8] text-left
          transition-all duration-150 outline-none
          ${open ? 'border-[#C8893A]/50 ring-1 ring-[#C8893A]/20' : 'border-[rgba(200,137,58,0.2)] hover:border-[rgba(200,137,58,0.3)]'}
        `}
      >
        <span className={value ? 'text-[#F0EAD8]' : 'text-[#F0EAD8]/40'}>{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#F0EAD8]/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-[#1A1410] border border-[rgba(200,137,58,0.2)] rounded-xl shadow-xl shadow-black/50 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`
                w-full px-3 py-2.5 text-sm text-left transition-colors duration-100
                ${opt.value === value
                  ? 'bg-[#C8893A]/20 text-[#C8893A]'
                  : 'text-[#F0EAD8]/80 hover:bg-[#C8893A]/5 hover:text-[#F0EAD8]'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
