import { useState } from 'react';
import { Link } from 'react-router-dom';

const questions = [
  { q: 'What is 2 + 2?', a: '4', options: ['3', '4', '5', '6'] },
  { q: 'Capital of Nigeria?', a: 'Abuja', options: ['Lagos', 'Abuja', 'Kano', 'Ibadan'] },
  { q: 'Which is a fruit?', a: 'Apple', options: ['Carrot', 'Apple', 'Potato', 'Onion'] },
];

export default function TriviaQuiz() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const answer = (opt: string) => {
    if (opt === questions[current].a) setScore(s => s + 1);
    if (current + 1 < questions.length) setCurrent(c => c + 1);
    else setDone(true);
  };

  return (
    <div className="max-w-md mx-auto">
      <Link to="/dashboard/games" className="text-sm text-white/60 hover:text-white mb-6 inline-block">← Back to Games</Link>
      <h1 className="text-3xl font-bold mb-2 text-center">Trivia Quiz</h1>
      {!done ? (
        <div className="border border-white/10 rounded-2xl p-6 bg-[#111]">
          <p className="text-sm text-white/50 mb-2">Question {current + 1} of {questions.length}</p>
          <h2 className="text-xl font-semibold mb-6">{questions[current].q}</h2>
          <div className="space-y-3">
            {questions[current].options.map(opt => (
              <button key={opt} onClick={() => answer(opt)} className="w-full text-left p-3 border border-white/10 rounded-xl hover:bg-white/5">
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center border border-white/10 rounded-2xl p-8 bg-[#111]">
          <div className="text-4xl font-bold mb-2">{score}/{questions.length}</div>
          <p className="text-white/60">Score: {score} correct</p>
          {score >= 2 && <div className="mt-4 text-emerald-400 text-sm">Eligible for reward (demo).</div>}
        </div>
      )}
    </div>
  );
}
