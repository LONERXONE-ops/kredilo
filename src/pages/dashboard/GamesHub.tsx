import { Link } from 'react-router-dom';

const games = [
  { name: 'Snake', path: '/games/snake', reward: 'Up to 50 Tokens', desc: 'Guide the snake, eat food and grow your score.' },
  { name: 'Memory Match', path: '/games/memory', reward: 'Up to 50 Tokens', desc: 'Find matching pairs and complete the grid.' },
  { name: 'Reaction Test', path: '/games/reaction', reward: 'Up to 30 Tokens', desc: 'Click as fast as you can when the signal appears.' },
  { name: 'Trivia Quiz', path: '/games/trivia', reward: 'Up to 40 Tokens', desc: 'Answer questions and test your knowledge.' },
];

export default function GamesHub() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Games Hub</h1>
      <p className="text-sm text-white/60 mb-8">Play built-in browser games and earn tokens. Rewards are based on eligible completions (demo mode).</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {games.map(g => (
          <Link key={g.name} to={g.path} className="p-5 border border-white/10 rounded-2xl bg-[#111] hover:border-white/20 transition">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 text-2xl">🎮</div>
            <h3 className="font-semibold">{g.name}</h3>
            <p className="text-xs text-white/50 mt-1 mb-3">{g.desc}</p>
            <div className="text-xs px-3 py-1 rounded-full bg-white/10 inline-block">{g.reward}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
