import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

const SIZE = 15;
const GOAL = 50;
type Dir = 'U' | 'D' | 'L' | 'R';
type P = { x: number; y: number };
type Game = { snake: P[]; food: P; dir: Dir; score: number; status: 'idle' | 'playing' | 'over' };

const opposite: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' };
const delta: Record<Dir, P> = { U: { x: 0, y: -1 }, D: { x: 0, y: 1 }, L: { x: -1, y: 0 }, R: { x: 1, y: 0 } };

function randomFood(snake: P[]): P {
  for (;;) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function fresh(): Game {
  const snake = [{ x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }];
  return { snake, food: randomFood(snake), dir: 'R', score: 0, status: 'idle' };
}

function step(g: Game, queued: Dir): Game {
  if (g.status !== 'playing') return g;
  const dir = queued === opposite[g.dir] ? g.dir : queued;
  const head = { x: g.snake[0].x + delta[dir].x, y: g.snake[0].y + delta[dir].y };
  const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
  const hitSelf = g.snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y);
  if (hitWall || hitSelf) return { ...g, dir, status: 'over' };
  const ate = head.x === g.food.x && head.y === g.food.y;
  const snake = [head, ...g.snake];
  if (!ate) snake.pop();
  return { ...g, dir, snake, food: ate ? randomFood(snake) : g.food, score: g.score + (ate ? 10 : 0) };
}

export default function SnakeGame() {
  const [game, setGame] = useState<Game>(fresh);
  const queued = useRef<Dir>('R');
  const touch = useRef<P | null>(null);

  const turn = useCallback((d: Dir) => {
    queued.current = d;
  }, []);

  const start = () => {
    queued.current = 'R';
    setGame({ ...fresh(), status: 'playing' });
  };

  useEffect(() => {
    if (game.status !== 'playing') return;
    const id = window.setInterval(() => setGame((g) => step(g, queued.current)), 150);
    return () => window.clearInterval(id);
  }, [game.status]);

  useEffect(() => {
    const keys: Record<string, Dir> = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key];
      if (!d) return;
      e.preventDefault();
      turn(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  const cells: ReactElement[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = game.snake.findIndex((s) => s.x === x && s.y === y);
      const isFood = game.food.x === x && game.food.y === y;
      cells.push(
        <div
          key={`${x}-${y}`}
          className={`aspect-square rounded-[3px] ${
            idx === 0 ? 'bg-white' : idx > 0 ? 'bg-white/65' : isFood ? 'scale-75 rounded-full bg-white/90' : 'bg-white/[0.04]'
          }`}
        />,
      );
    }
  }

  const pad = (d: Dir, Icon: typeof ArrowUp, label: string) => (
    <button
      aria-label={label}
      onPointerDown={() => turn(d)}
      className="pressable flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] active:bg-white/25"
    >
      <Icon size={26} />
    </button>
  );

  return (
    <GameShell title="Snake" goal={`Eat food to grow. Reach a score of ${GOAL} to hit the goal.`}>
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Score: {game.score}</span>
        <span className="text-white/50">Goal: {GOAL}</span>
      </div>
      <div
        className="grid touch-none gap-px rounded-3xl border border-white/15 bg-[#0b0b0b] p-2"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const t = touch.current;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
        }}
      >
        {cells}
      </div>

      {game.status !== 'playing' ? (
        <div className="mt-5 space-y-3 text-center">
          {game.status === 'over' && (
            <>
              <p className="font-bold">Game over — you scored {game.score}.</p>
              <GameResult game="snake" score={game.score} headline={game.score >= GOAL ? 'You reached the goal! 🎉' : 'Nice run!'} />
            </>
          )}
          <button onClick={start} className="pressable min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
            {game.status === 'over' ? 'Play Again' : 'Start Game'}
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3">
          {pad('U', ArrowUp, 'Up')}
          <div className="flex items-center gap-6">
            {pad('L', ArrowLeft, 'Left')}
            {pad('D', ArrowDown, 'Down')}
            {pad('R', ArrowRight, 'Right')}
          </div>
          <p className="mt-1 text-xs text-white/40">Swipe on the board, use arrow keys / WASD, or tap the buttons.</p>
        </div>
      )}
    </GameShell>
  );
}
