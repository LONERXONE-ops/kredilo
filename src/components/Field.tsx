import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export const inputCls =
  'h-12 w-full rounded-2xl border border-white/12 bg-black/40 px-4 text-sm outline-none transition placeholder:text-white/30 focus:border-white/40 focus:bg-black/60';

// Labelled form row.
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-white/75">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </div>
  );
}

// Card section with an icon header.
export function FormSection({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
        {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/80">{icon}</span>}
        <div>
          <h3 className="font-extrabold leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-white/45">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

// On/off switch.
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="text-sm font-semibold text-white/80">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

// Styled native select with a chevron.
export function SelectInput({ value, onChange, ariaLabel, children }: { value: string | number; onChange: (v: string) => void; ariaLabel: string; children: ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} className={`${inputCls} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40" />
    </div>
  );
}
