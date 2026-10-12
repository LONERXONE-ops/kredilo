import { useMemo, useState } from 'react';
import { GameShell } from '../../components/GameShell';
import { GameResult } from '../../components/GameResult';

type Q = { q: string; options: string[]; answer: number };

const BANK: Q[] = [
  { q: 'What is the capital of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'], answer: 1 },
  { q: 'What is 7 × 8?', options: ['54', '56', '58', '64'], answer: 1 },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1 },
  { q: 'What is the chemical formula for water?', options: ['CO2', 'O2', 'H2O', 'NaCl'], answer: 2 },
  { q: 'In what year did Nigeria become independent?', options: ['1957', '1960', '1963', '1970'], answer: 1 },
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], answer: 2 },
  { q: 'Which Nigerian city is known as the “Centre of Excellence”?', options: ['Abuja', 'Lagos', 'Port Harcourt', 'Enugu'], answer: 1 },
  { q: 'What is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'], answer: 1 },
  { q: 'Which animal is known as the king of the jungle?', options: ['Tiger', 'Elephant', 'Lion', 'Leopard'], answer: 2 },
  { q: 'What is the currency of Nigeria?', options: ['Cedi', 'Naira', 'Franc', 'Shilling'], answer: 1 },
  { q: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: 1 },
  { q: 'Which river is the longest in the world?', options: ['Amazon', 'Nile', 'Niger', 'Congo'], answer: 1 },
  { q: 'What does CPU stand for?', options: ['Central Process Unit', 'Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit'], answer: 1 },
  { q: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 },
  { q: 'Who wrote “Things Fall Apart”?', options: ['Wole Soyinka', 'Chinua Achebe', 'Ben Okri', 'Chimamanda Adichie'], answer: 1 },
  { q: 'What is 15% of 200?', options: ['20', '25', '30', '35'], answer: 2 },
  { q: 'Which is NOT a primary colour?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 2 },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2 },
  { q: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], answer: 2 },
];

const ROUND = 10;

function pickRound(): Q[] {
  const d = [...BANK];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d.slice(0, ROUND);
}

export default function TriviaQuiz() {
  const [round, setRound] = useState<Q[]>(pickRound);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const questions = round;
  const done = index >= questions.length;
  const cur = useMemo(() => questions[index], [questions, index]);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[index].answer) setScore((s) => s + 1);
  };

  const restart = () => { setRound(pickRound()); setIndex(0); setPicked(null); setScore(0); };

  if (done) {
    return (
      <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
        <div className="rounded-3xl border border-white/15 bg-white/[0.03] p-8 text-center">
          <div className="text-6xl font-extrabold">{score}/{questions.length}</div>
          <p className="mt-2 text-white/60">correct answers</p>
        </div>
        <GameResult game="trivia" score={score * 4} headline={`You got ${score} of ${questions.length} right!`} />
        <button onClick={restart} className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">Play Again</button>
      </GameShell>
    );
  }

  return (
    <GameShell title="Trivia Quiz" goal="Answer the questions to test your knowledge.">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span>Question {index + 1}/{questions.length}</span>
        <span className="text-white/50">Score: {score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${(index / questions.length) * 100}%` }} />
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
              className={`flex min-h-14 w-full items-center rounded-2xl border px-5 text-left text-sm font-bold transition ${
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
          onClick={() => { setIndex((n) => n + 1); setPicked(null); }}
          className="pressable mt-5 min-h-12 w-full rounded-full bg-white text-sm font-bold text-black hover:bg-white/90"
        >
          {index + 1 === questions.length ? 'See Result' : 'Next Question'}
        </button>
      )}
    </GameShell>
  );
}
