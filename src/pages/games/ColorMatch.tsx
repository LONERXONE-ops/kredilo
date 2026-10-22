import { useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'YELLOW', hex: '#eab308' },
  { name: 'PURPLE', hex: '#a855f7' },
];
const SECONDS = 30;

type Prompt = { word: string; ink: string; match: boolean };
function nextPrompt(): Prompt {
  const wi = Math.floor(Math.random() * COLORS.length);
  const shouldMatch = Math.random() < 0.5;
  const ii = shouldMatch ? wi : (wi + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
  return { word: COLORS[wi].name, ink: COLORS[ii].hex, match: wi === ii };
}

export default function ColorMatch() {
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [prompt, setPrompt] = useState<Prompt>(nextPrompt);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    setScore(0); setLeft(SECONDS); setPrompt(nextPrompt()); setState('playing');
    timer.current = window.setInterval(() => {
      setLeft((n) => { if (n <= 1) { window.clearInterval(timer.current); setState('done'); return 0; } return n - 1; });
    }, 1000);
  };

  const answer = (said: boolean) => {
    if (state !== 'playing') return;
    const correct = said === prompt.match;
    if (correct) setScore((s) => s + 1);
    setFlash(correct ? 'ok' : 'no');
    window.setTimeout(() => setFlash(null), 150);
    setPrompt(nextPrompt());
  };

  return (
    <GameShell title="Color Match" goal="Does the WORD match the COLOUR it is written in? Answer as many as you can in 30 seconds.">
      {state === 'idle' && (
        <button onClick={start} className="pressable flex h-64 w-full items-center justify-center rounded-3xl border border-white/15 bg-white/[0.04] text-2xl font-extrabold">Tap to start</button>
      )}
      {state === 'playing' && (
        <div>
          <div className="mb-3 flex items-center justify-between text-sm font-bold"><span>Score: {score}</span><span className="text-white/50">{left}s</span></div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>
          <div className={`flex h-40 items-center justify-center rounded-3xl border bg-white/[0.03] text-5xl font-extrabold transition ${flash === 'ok' ? 'border-emerald-400' : flash === 'no' ? 'border-red-400' : 'border-white/15'}`}>
            <span style={{ color: prompt.ink }}>{prompt.word}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => answer(true)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">Match</button>
            <button onClick={() => answer(false)} className="pressable min-h-14 rounded-2xl border border-white/20 bg-white/[0.03] text-base font-extrabold hover:bg-white/10">No match</button>
          </div>
        </div>
      )}
      {state === 'done' && (
        <>
          <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center"><div className="text-6xl font-extrabold">{score}</div><p className="mt-2 text-white/60">correct in {SECONDS}s</p></div>
          <GameResult game="stroop" score={score * 2} headline={`You matched ${score} correctly!`} />
          <button onClick={start} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
        </>
      )}
    </GameShell>
  );
}
