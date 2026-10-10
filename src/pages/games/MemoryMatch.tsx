import { useState } from 'react';
import { Link } from 'react-router-dom';

const pairs = ['🍎', '🍌', '🍇', '🍉', '🍎', '🍌', '🍇', '🍉'];

export default function MemoryMatch() {
  const [cards, setCards] = useState(pairs.map((p, i) => ({ id: i, emoji: p, flipped: false, matched: false })));
  const [flipped, setFlipped] = useState<number[]>([]);

  const flip = (id: number) => {
    if (flipped.length >= 2 || cards[id].matched || cards[id].flipped) return;
    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);
    setFlipped([...flipped, id]);

    if (flipped.length === 1) {
      const first = cards[flipped[0]];
      if (first.emoji === newCards[id].emoji) {
        setTimeout(() => {
          setCards(c => c.map(card => card.emoji === first.emoji ? { ...card, matched: true } : card));
          setFlipped([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(c => c.map((card, i) => i === id || i === flipped[0] ? { ...card, flipped: false } : card));
          setFlipped([]);
        }, 800);
      }
    }
  };

  const matchedCount = cards.filter(c => c.matched).length / 2;

  return (
    <div className="max-w-md mx-auto text-center">
      <Link to="/dashboard/games" className="text-sm text-white/60 hover:text-white mb-6 inline-block">← Back to Games</Link>
      <h1 className="text-3xl font-bold mb-2">Memory Match</h1>
      <p className="text-sm text-white/60 mb-6">Find all pairs. Matched: {matchedCount}/4</p>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {cards.map(card => (
          <button key={card.id} onClick={() => flip(card.id)} className="aspect-square border border-white/10 rounded-xl bg-[#111] text-3xl flex items-center justify-center">
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>
      {matchedCount === 4 && <div className="text-emerald-400">All pairs found! Eligible for reward (demo).</div>}
    </div>
  );
}
