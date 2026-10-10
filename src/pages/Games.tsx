import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

const games = [
  { name: 'Snake', desc: 'Guide the snake, eat food and grow your score.', reward: 'Up to 50 Tokens' },
  { name: 'Memory Match', desc: 'Find matching pairs and complete the grid.', reward: 'Up to 50 Tokens' },
  { name: 'Reaction Test', desc: 'Click as fast as you can when the signal appears.', reward: 'Up to 30 Tokens' },
  { name: 'Trivia Quiz', desc: 'Answer questions and test your knowledge.', reward: 'Up to 40 Tokens' },
];

export default function Games() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
        <div>
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs mb-4">Built-in Games</div>
          <h1 className="text-4xl sm:text-5xl font-bold">Play Games, Earn Tokens.</h1>
          <p className="mt-4 text-white/60">Enjoy fun and engaging browser games directly on Kredilo. Complete challenges, earn tokens, and make your time more rewarding.</p>
          <Link to="/dashboard/games" className="inline-flex mt-6 bg-white text-black px-6 py-3 rounded-full font-semibold">
            Explore Games Hub →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {games.map((g) => (
            <div key={g.name} className="p-5 border border-white/10 rounded-2xl bg-[#111]">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 text-2xl">🎮</div>
              <h3 className="font-semibold">{g.name}</h3>
              <p className="text-xs text-white/50 mt-1 mb-3">{g.desc}</p>
              <div className="text-xs px-3 py-1 rounded-full bg-white/10 inline-block">{g.reward}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs mb-4">Why Kredilo</div>
        <h2 className="text-3xl font-bold mb-8">More Than Just Tasks.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Clear Task Instructions', desc: 'Know exactly what to do, before you start.' },
            { title: 'Transparent Rewards', desc: 'See the token amount, time and eligibility upfront.' },
            { title: 'Visible Progress', desc: 'Track your task status in real time.' },
            { title: 'Trackable Token History', desc: 'View your earnings and transaction history anytime.' },
            { title: 'Clear Withdrawal Requirements', desc: 'Understand minimum amounts, fees and payout details.' },
          ].map((item) => (
            <div key={item.title} className="p-5 border border-white/10 rounded-2xl bg-[#111]">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-white/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
