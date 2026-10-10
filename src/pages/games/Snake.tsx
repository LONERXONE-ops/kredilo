import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

export default function SnakeGame() {
  const [score, setScore] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Simple demo snake: click to "play" and increase score
  const play = useCallback(() => {
    if (!playing) setPlaying(true);
    setScore(s => s + 10);
  }, [playing]);

  return (
    <div className="max-w-md mx-auto text-center">
      <Link to="/dashboard/games" className="text-sm text-white/60 hover:text-white mb-6 inline-block">← Back to Games</Link>
      <h1 className="text-3xl font-bold mb-2">Snake</h1>
      <p className="text-sm text-white/60 mb-6">Reach 50+ to qualify for reward (demo interaction).</p>
      <div className="border border-white/10 rounded-2xl p-8 bg-[#111] mb-6">
        <div className="text-5xl font-bold mb-4">{score}</div>
        <div className="w-48 h-48 mx-auto bg-black/50 border border-white/10 rounded-xl flex items-center justify-center text-4xl mb-4">
          🐍
        </div>
        <button onClick={play} className="bg-white text-black px-6 py-3 rounded-full font-semibold">
          {playing ? 'Grow Snake (+10)' : 'Start Game'}
        </button>
      </div>
      {score >= 50 && <div className="text-emerald-400 text-sm">Eligible for up to 50 tokens! (Demo — backend validation required)</div>}
    </div>
  );
}
