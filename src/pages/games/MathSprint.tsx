import { useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SECONDS = 30;
type Problem = { text: string; answer: number; options: number[] };

function makeProblem(): Problem {
  const ops = ['+', '-', '\u00d7'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  let answer: number;
  if (op === '+') answer = a + b;
  else if (op === '-') { if (b > a) { const tmp = a; a = b; b = tmp; } answer = a - b; }
  else answer = a * b;
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = Math.floor(Math.random() * 9) - 4;
    const cand = answer + delta + (delta === 0 ? 1 : 0);
    if (cand >= 0) set.add(cand);
  }
  const options = [...set].sort(() => Math.random() - 0.5);
  return { text: `${a} ${op} ${b}`, answer, options };
}

export default function MathSprint() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [problem, setProblem] = useState<Problem>(makeProblem);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setProblem(makeProblem()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const pick = (v: number) => {
    if (state !== 'playing') return;
    if (v === problem.answer) setScore((s) => s + 1);
    setFlash(v === problem.answer ? 1 : 0);
    window.setTimeout(() => setFlash(null), 120);
    setProblem(makeProblem());
  };

  return (
    <GameShell title="Math Sprint" goal="Solve as many as you can in 30 seconds. Tap the correct answer." icon={Calculator}>
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-32 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 1 ? 'border-emerald-400' : flash === 0 ? 'border-red-400' : 'border-white/15'}`}>{problem.text}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {problem.options.map((o) => (
              <button key={o} onClick={() => pick(o)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-xl font-extrabold hover:bg-white/10">{o}</button>
            ))}
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">solved in {SECONDS}s</p></div>
          <GameResult game="math" score={score * 2} headline={`You solved ${score}!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
