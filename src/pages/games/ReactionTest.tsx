import { useEffect, useRef, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

// Faster reaction = more kreds. ~200ms → 30, 500ms+ → 0.
const reactionKreds = (ms: number) => Math.max(0, Math.min(30, Math.round((500 - ms) / 10)));

type State = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export default function ReactionTest() {
  const [state, setState] = useState<State>('idle');
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const startAt = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const begin = () => {
    setState('waiting');
    timer.current = window.setTimeout(() => {
      startAt.current = Date.now();
      setState('ready');
    }, 1000 + Math.random() * 3000);
  };

  const press = () => {
    if (state === 'waiting') {
      window.clearTimeout(timer.current);
      setState('early');
    } else if (state === 'ready') {
      const t = Date.now() - startAt.current;
      setTime(t);
      setBest((b) => (b === null || t < b ? t : b));
      setState('result');
    } else {
      begin();
    }
  };

  const label: Record<State, string> = {
    idle: 'Tap to start',
    waiting: 'Wait for it...',
    ready: 'TAP NOW!',
    result: `${time} ms. Tap to try again`,
    early: 'Too soon! Tap to try again',
  };

  return (
    <GameShell title="Reaction Test" goal="Wait for the screen to turn white, then tap as fast as you can.">
      <button
        onClick={press}
        className={`flex h-64 w-full items-center justify-center rounded-3xl border px-6 text-center text-2xl font-extrabold transition ${
          state === 'ready' ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.04]'
        }`}
      >
        {label[state]}
      </button>
      <p className="mt-4 text-center text-sm font-bold">{best === null ? 'No best time yet' : `Best: ${best} ms`}</p>
      {state === 'result' && best !== null && (
        <GameResult game="reaction" score={reactionKreds(best)} headline={`Best reaction: ${best} ms`} />
      )}
    </GameShell>
  );
}
