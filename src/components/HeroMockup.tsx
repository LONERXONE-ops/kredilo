import { ChevronRight, Gamepad2 } from 'lucide-react';

// Decorative product preview from the concept art. Skeleton bars only: no fake numbers.
const Bar = ({ w = 'w-24', className = '' }: { w?: string; className?: string }) => (
  <div className={`h-1.5 rounded-full bg-white/25 ${w} ${className}`} />
);

const rows = [
  { label: 'In Progress', style: 'bg-white/15 text-white' },
  { label: 'Available', style: 'bg-white/15 text-white' },
  { label: 'Completed', style: 'bg-white/10 text-white/70' },
];

export function HeroMockup() {
  return (
    <div aria-hidden="true" className="rounded-[1.75rem] sm:rounded-[2rem] bg-white p-[3px] shadow-[0_30px_80px_-20px_rgba(255,255,255,0.12)]">
      <div className="flex gap-2 sm:gap-2.5 rounded-[1.6rem] sm:rounded-[1.9rem] bg-[#0b0b0b] p-2 sm:p-2.5">
        {/* Sidebar */}
        <div className="hidden sm:flex w-9 shrink-0 flex-col items-center gap-2.5 rounded-2xl bg-[#161616] py-3">
          <div className="h-3 w-3 rounded-full bg-white/80" />
          <div className="mt-2 h-1 w-4 rounded-full bg-white/25" />
          {[0, 1, 2].map((i) => <div key={i} className="h-4 w-4 rounded-md bg-white/30" />)}
          <div className="h-1 w-4 rounded-full bg-white/25" />
          <div className="h-1 w-4 rounded-full bg-white/25" />
          <div className="mt-auto h-3 w-3 rounded-full bg-white/80" />
        </div>

        <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
          <div className="grid grid-cols-1 min-[520px]:grid-cols-[1.7fr_1fr] gap-2 sm:gap-2.5">
            {/* Your Tasks */}
            <div className="rounded-2xl bg-[#161616] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <Bar w="w-20" className="h-2 bg-white/60" />
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-2 w-5 rounded-full bg-white/25" />)}
                </div>
              </div>
              <div className="rounded-xl bg-[#1d1d1d] p-2.5">
                <div className="mb-2 text-[11px] font-bold text-white/90">Your Tasks</div>
                <div className="space-y-1.5">
                  {rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-2 rounded-lg bg-[#262626] p-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-md bg-white/30" />
                        <div className="space-y-1.5"><Bar w="w-16" className="bg-white/60" /><Bar w="w-10" /></div>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.style}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="rounded-2xl bg-[#161616] p-3 sm:p-4">
              <div className="mb-3 text-[11px] font-bold text-white/90">Balance</div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/60 bg-white/10 text-[10px] font-extrabold">TK</div>
                <div className="space-y-1.5 flex-1"><Bar w="w-full" className="bg-white/40" /><Bar w="w-2/3" /></div>
                <ChevronRight size={14} className="text-white/60" />
              </div>
              <div className="mt-3 h-6 rounded-lg bg-white/80" />
              <div className="mt-2 h-8 rounded-lg bg-white/15" />
            </div>
          </div>

          <div className="grid grid-cols-2 min-[520px]:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Featured Task */}
            <div className="rounded-2xl bg-[#161616] p-3 sm:p-4">
              <div className="mb-2 text-[11px] font-bold text-white/90">Featured Task</div>
              <div className="flex gap-2.5">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-white/40" />
                <div className="space-y-1.5 pt-1"><Bar w="w-12" className="bg-white/50" /><Bar w="w-8" /></div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold">Explore <ChevronRight size={10} /></div>
            </div>
            {/* Quick Action */}
            <div className="hidden min-[520px]:block rounded-2xl bg-[#161616] p-3 sm:p-4">
              <div className="mb-2 text-[11px] font-bold text-white/90">Quick Action</div>
              <div className="space-y-1.5"><Bar w="w-full" className="bg-white/40" /><Bar w="w-3/4" /></div>
              <div className="mt-3 flex h-7 items-center justify-end rounded-full bg-white/35 px-1.5">
                <div className="h-4 w-4 rounded-full bg-white/70" />
              </div>
            </div>
            {/* Play Game */}
            <div className="rounded-2xl bg-[#161616] p-3 sm:p-4">
              <div className="mb-2 text-[11px] font-bold text-white/90">Play Game</div>
              <div className="flex h-12 items-center justify-center rounded-xl bg-[#222]"><Gamepad2 size={26} className="text-white/80" /></div>
              <div className="mt-2 flex justify-center gap-1">
                {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1 w-1 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/30'}`} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
