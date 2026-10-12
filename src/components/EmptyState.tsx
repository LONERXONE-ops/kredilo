import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

// Friendly placeholder for empty lists — a soft icon, a line of reassurance, and an optional nudge.
export function EmptyState({ icon: Icon, title, text, action }: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06] text-white/40">
        <Icon size={30} strokeWidth={1.6} />
      </span>
      <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/50">{text}</p>
      {action && (
        <Link to={action.to} className="pressable mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black hover:bg-white/90">
          {action.label}
        </Link>
      )}
    </div>
  );
}
