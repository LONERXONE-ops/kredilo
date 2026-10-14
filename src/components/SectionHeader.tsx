import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// A page title with an optional tap-to-reveal description (smoothly animated) and an
// optional element pinned to the right edge (e.g. the streak badge).
export function SectionHeader({ title, info, right }: { title: string; info?: string; right?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-4xl font-extrabold">{title}</h1>
          {info && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Hide details' : 'Show details'}
              aria-expanded={open}
              className="pressable mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronDown size={18} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {right}
      </div>
      {info && (
        <div className={`grid transition-all duration-300 ease-out ${open ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <p className="max-w-xl text-white/55">{info}</p>
          </div>
        </div>
      )}
    </div>
  );
}
