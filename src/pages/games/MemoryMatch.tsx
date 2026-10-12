import { useState } from 'react';
import { Cloud, Heart, Moon, Star, Sun, Zap } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const icons = [Star, Heart, Moon, Sun, Cloud, Zap];

function shuffled(): number[] {
  const deck = [...Array.from({ length: icons.length }, (_, i) => i), ...Array.from({ length: icons.length }, (_, i) => i)];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export default function MemoryMatch() {
  const [deck, setDeck] = useState<number[]>(shuffled);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        setTimeout(() => {
          setMatched((m) => [...m, a, b]);
          setOpen([]);
        }, 400);
      } else {
        setTimeout(() => setOpen([]), 800);
      }
    }
  };

  const restart = () => {
    setDeck(shuffled());
    setOpen([]);
    setMatched([]);
    setMoves(0);
  };

  const won = matched.length === deck.length;

  return (
    <GameShell title="Memory Match" goal="Flip two cards at a time and find all the matching pairs.">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Pairs: {matched.length / 2}/{icons.length}</span>
        <span className="text-white/50">Moves: {moves}</span>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {deck.map((v, i) => {
          const shown = open.includes(i) || matched.includes(i);
          const Icon = icons[v];
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={shown ? 'Card' : 'Hidden card'}
              className={`flex aspect-square items-center justify-center rounded-2xl border transition ${
                matched.includes(i) ? 'border-white/10 bg-white/10 text-white/50' : shown ? 'border-white bg-white text-black' : 'border-white/15 bg-white/[0.05]'
              }`}
            >
              {shown && <Icon size={28} />}
            </button>
          );
        })}
      </div>
      {won && (
        <GameResult
          game="memory"
          score={Math.max(10, 50 - Math.max(0, moves - icons.length) * 3)}
          headline={`All pairs found in ${moves} moves!`}
        />
      )}
      <button onClick={restart} className="pressable mt-5 min-h-12 w-full rounded-full border border-white/25 text-sm font-bold hover:bg-white/5">
        {won ? 'Play Again' : 'Restart'}
      </button>
    </GameShell>
  );
}
