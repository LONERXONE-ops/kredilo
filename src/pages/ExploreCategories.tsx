import { Link } from 'react-router-dom';
import { MessageSquare, ClipboardList, Smartphone, Pencil, Gamepad2, ShoppingBag, Search, Grid } from 'lucide-react';

const categories = [
  { icon: MessageSquare, title: 'Social Media', desc: 'Follow, like, share and engage with content on social platforms.', tasks: 12 },
  { icon: ClipboardList, title: 'Surveys', desc: 'Share your opinions and help brands improve their products and services.', tasks: 8 },
  { icon: Smartphone, title: 'Apps & Sign Ups', desc: 'Try new apps, create accounts and complete simple actions.', tasks: 10 },
  { icon: Pencil, title: 'Content Creation', desc: 'Create and submit content like posts, videos or reviews.', tasks: 6 },
  { icon: Gamepad2, title: 'Gaming', desc: 'Play exciting browser games and complete daily challenges.', tasks: 7 },
  { icon: ShoppingBag, title: 'Shopping & Offers', desc: 'Explore special offers and complete eligible actions.', tasks: 5 },
  { icon: Search, title: 'Research & Reviews', desc: 'Read, test and share your honest feedback.', tasks: 4 },
  { icon: Grid, title: 'Other Tasks', desc: 'Unique activities and special campaigns.', tasks: 3 },
];

export default function ExploreCategories() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm mb-4">Task Categories</div>
        <h1 className="text-4xl sm:text-5xl font-bold">Explore Task Categories</h1>
        <p className="mt-4 text-white/60">Choose from a variety of activities, complete the requirements, and earn tokens for your efforts.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((c) => (
          <Link key={c.title} to="/tasks" className="group p-6 border border-white/10 rounded-2xl bg-[#111] hover:border-white/20 transition">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/15 transition">
              <c.icon size={22} />
            </div>
            <h3 className="font-semibold text-lg mb-2">{c.title}</h3>
            <p className="text-sm text-white/60 mb-4">{c.desc}</p>
            <div className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/10">
              {c.tasks} Tasks →
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-12 p-6 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Gamepad2 size={20} /></div>
          <div>
            <div className="font-semibold">Play Games, Earn More</div>
            <div className="text-sm text-white/60">Enjoy our built-in browser games and earn tokens while having fun.</div>
          </div>
        </div>
        <Link to="/games" className="border border-white/20 px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/5">
          Go to Games →
        </Link>
      </div>
    </div>
  );
}
