import { useState } from 'react';
import { GameShell } from '../../components/GameShell';

const questions = [
  { q: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], answer: 1 },
  { q: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
  { q: 'What is the chemical formula for water?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'In what year did Nigeria become independent?', options: ['1957', '1960', '1963', '1970'], answer: 1 },
];

export default function TriviaQuiz() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[index].answer) setScore((s) => s + 1);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  if (done) {
    return (
      <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
          <div className="text-6xl font-extrabold">{score}/{questions.length}</div>
          <p className="mt-2 text-white/60">correct answers</p>
        </div>
        <button onClick={restart} className="mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
      </GameShell>
    );
  }

  const cur = questions[index];
  return (
    <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Question {index + 1}/{questions.length}</span>
        <span className="text-white/50">Score: {score}</span>
      </div>
      <h2 className="text-xl font-extrabold leading-snug">{cur.q}</h2>
      <div className="mt-4 space-y-2.5">
        {cur.options.map((o, i) => {
          const right = picked !== null && i === cur.answer;
          const wrong = picked === i && i !== cur.answer;
          return (
            <button
              key={o}
              onClick={() => pick(i)}
              className={`flex min-h-14 w-full items-center rounded-full border px-5 text-left text-sm font-bold transition ${
                right ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : wrong ? 'border-red-400 bg-red-500/15 text-red-300' : 'border-white/20 bg-white/[0.03] hover:bg-white/10'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <button
          onClick={() => {
            setIndex((n) => n + 1);
            setPicked(null);
          }}
          className="mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
        >
          {index + 1 === questions.length ? 'See Result' : 'Next Question'}
        </button>
      )}
    </GameShell>
  );
}
