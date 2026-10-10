import type { ComponentType, ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthShell({
  badge,
  title,
  subtitle,
  children,
  panel,
}: {
  badge: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  panel: { title: string; text: string; items: { icon: ComponentType<{ size?: number }>; title: string; text: string }[] };
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto grid max-w-5xl gap-5 px-5 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div className="rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 p-6 sm:p-9">
          <span className="inline-block rounded-full border border-white/25 px-3 py-1 text-xs font-bold">{badge}</span>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-[2.6rem]">{title}</h1>
          <p className="mt-2 max-w-sm text-white/60">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>

        <aside className="hidden rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 p-9 lg:block">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-[#2a2a2a] to-[#0c0c0c] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
            <Logo markOnly className="h-11 w-auto text-white" />
          </div>
          <h2 className="text-3xl font-extrabold leading-tight">{panel.title}</h2>
          <p className="mt-2 text-sm text-white/60">{panel.text}</p>
          <ul className="mt-7 space-y-4">
            {panel.items.map((it) => (
              <li key={it.title} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"><it.icon size={22} /></span>
                <span>
                  <span className="block text-sm font-bold">{it.title}</span>
                  <span className="block text-xs text-white/55">{it.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
