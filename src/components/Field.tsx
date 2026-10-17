import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

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
    <section className="rounded-3xl border border-white/10 bg-[#0e0e0e]">
      <div className="flex items-center gap-3 rounded-t-3xl border-b border-white/[0.06] bg-white/[0.03] px-5 py-3.5">
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

type Opt = { value: string; label: ReactNode };

// Custom on-brand dropdown. Keeps the same API as a styled <select> — pass <option> children —
// but renders a compact, consistent menu instead of the mobile browser's native picker.
export function SelectInput({
  value, onChange, ariaLabel, children, triggerClassName, align = 'left',
}: {
  value: string | number;
  onChange: (v: string) => void;
  ariaLabel: string;
  children: ReactNode;
  triggerClassName?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options: Opt[] = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => {
      const p = (el as { props: { value?: unknown; children?: ReactNode } }).props;
      return { value: String(p.value ?? ''), label: p.children };
    });
  const current = options.find((o) => o.value === String(value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const trigger = triggerClassName ?? `${inputCls} flex items-center justify-between gap-2 text-left`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={trigger}>
        <span className="truncate">{current ? current.label : ''}</span>
        <ChevronDown size={16} className={`shrink-0 text-white/45 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={`absolute z-50 mt-2 max-h-64 min-w-full overflow-auto rounded-2xl border border-white/12 bg-[#161616] p-1.5 shadow-2xl shadow-black/60 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map((o) => {
            const selected = o.value === String(value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${selected ? 'bg-emerald-500/15 text-emerald-300' : 'text-white/80 hover:bg-white/10'}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check size={15} className="shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
