import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ReactionTest() {
  const [state, setState] = useState<'waiting' | 'ready' | 'clicked' | 'tooSoon'>('waiting');
  const [time, setTime] = useState(0);
  const [start, setStart] = useState(0);

  const begin = () => {
    setState('waiting');
    const delay = 1000 + Math.random() * 3000;
    setTimeout(() => {
      setState('ready');
      setStart(Date.now());
    }, delay);
  };

  const click = () => {
    if (state === 'ready') {
      setTime(Date.now() - start);
      setState('clicked');
    } else if (state === 'waiting') {
      setState('tooSoon');
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <Link to="/dashboard/games" className="text-sm text-white/60 hover:text-white mb-6 inline-block">← Back to Games</Link>
      <h1 className="text-3xl font-bold mb-2">Reaction Test</h1>
      <p className="text-sm text-white/60 mb-6">Click when the box turns green.</p>
      <div onClick={click} className={`h-64 border border-white/10 rounded-2xl flex items-center justify-center cursor-pointer transition-colors ${
        state === 'ready' ? 'bg-emerald-500' : state === 'clicked' ? 'bg-white/10' : 'bg-[#111]'
      }`}>
        {state === 'waiting' && <span>Wait for green...</span>}
        {state === 'ready' && <span className="text-2xl font-bold">CLICK!</span>}
        {state === 'clicked' && <span className="text-2xl">{time} ms</span>}
        {state === 'tooSoon' && <span>Too soon! Try again.</span>}
      </div>
      <button onClick={begin} className="mt-6 bg-white text-black px-6 py-3 rounded-full font-semibold">Start</button>
      {time > 0 && time < 300 && <div className="mt-4 text-emerald-400 text-sm">Great reaction! Eligible for reward (demo).</div>}
    </div>
  );
}
