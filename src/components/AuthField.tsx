import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function AuthField({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  hint,
  autoComplete,
  required = true,
}: {
  label: string;
  icon: LucideIcon;
  type?: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold">{label}</label>
      <div className="relative">
        <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
        <input
          required={required}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 w-full rounded-full border border-white/20 bg-black/40 pl-11 pr-12 text-sm outline-none placeholder:text-white/35 focus:border-white/50"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/55 hover:text-white"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-white/45">{hint}</p>}
    </div>
  );
}
