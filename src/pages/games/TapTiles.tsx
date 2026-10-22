import { useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 20;
const TILES = 9;

export default function TapTiles() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [active, setActive] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [miss, setMiss] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setActive(Math.floor(Math.random() * TILES)); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const tap = (i: number) => {
    if (state !== 'playing') return;
    if (i === active) {
      setScore((s) => s + 1);
      setActive((cur) => { let n = cur; while (n === cur) n = Math.floor(Math.random() * TILES); return n; });
    } else {
      setMiss(true); window.setTimeout(() => setMiss(false), 120);
    }
  };

  return (
    <GameShell title="Tap Tiles" goal="Tap the emerald tile as fast as you can. You have 20 seconds." icon={Target}>
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className={miss ? 'text-red-400' : 'text-white/50'}>{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: TILES }).map((_, i) => (
              <button key={i} onClick={() => tap(i)} aria-label="tile" className={`pressable aspect-square rounded-2xl border transition ${i === active ? 'border-emerald-400 bg-emerald-500/80' : 'border-white/15 bg-white/[0.04] hover:bg-white/10'}`} />
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">taps in {SECONDS}s</p></div>
          <GameResult game="tiles" score={score} headline={`You tapped ${score} tiles!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
