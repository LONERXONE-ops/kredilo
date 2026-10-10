import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coins, CreditCard, Headphones, Lock, Minus, Plus, Search, ShieldCheck, Wallet, CircleX } from 'lucide-react';

const faqs = [
  { icon: Coins, q: 'How do I earn tokens on Kredilo?', a: 'Complete eligible tasks and play built-in games. Tokens are credited only after a task or game completion is verified against its rules. Nothing is guaranteed, and not every attempt earns a reward.' },
  { icon: ShieldCheck, q: 'How long does task verification take?', a: 'It depends on the task. Some, like built-in games, can be checked automatically. Others need manual review. You can follow the status of each task under My Tasks on your dashboard.' },
  { icon: CircleX, q: 'What happens if my submission is rejected?', a: 'You will see the reason for the rejection. No tokens are credited for a rejected submission.' },
  { icon: Wallet, q: 'When can I request a withdrawal?', a: 'Withdrawals are not available yet. The planned minimum is 10,000 tokens (₦1,000), at 10 tokens = ₦1. This rate is provisional. We will announce clearly when withdrawals open.' },
  { icon: CreditCard, q: 'What payout methods are supported?', a: 'None yet. Kredilo does not currently send real money. Payout methods will be announced once secure payments are ready.' },
  { icon: Lock, q: 'How do I keep my account secure?', a: 'Use a strong, unique password and never share your login details. Kredilo will never ask for your password.' },
  { icon: Headphones, q: 'How can I get support?', a: 'Use the Contact page, or open Help & Support from your Profile once you are logged in.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [search, setSearch] = useState('');
  const shown = faqs.map((f, i) => ({ ...f, i })).filter((f) => (f.q + f.a).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
        <div>
          <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">Frequently Asked Questions</span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Got Questions? We’ve Got Answers.</h1>
          <p className="mt-5 max-w-md text-lg text-white/60">
            Quick answers about earning tokens, task verification, withdrawals and account security.
          </p>
          <div className="relative mt-8">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="h-14 w-full rounded-full border border-white/20 bg-black/40 pl-12 pr-4 text-sm outline-none placeholder:text-white/35 focus:border-white/50"
            />
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Headphones size={26} /></span>
              <div>
                <div className="text-lg font-extrabold">Still need help?</div>
                <div className="text-sm text-white/55">Send us a message.</div>
              </div>
            </div>
            <Link to="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-bold hover:bg-white/5">
              Contact Support <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-2.5">
          {shown.map((f) => {
            const isOpen = open === f.i;
            return (
              <div key={f.q} className="rounded-3xl border border-white/15 bg-white/[0.02]">
                <button
                  onClick={() => setOpen(isOpen ? null : f.i)}
                  aria-expanded={isOpen}
                  className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><f.icon size={20} /></span>
                  <span className="flex-1 font-bold">{f.q}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">{isOpen ? <Minus size={18} /> : <Plus size={18} />}</span>
                </button>
                {isOpen && <p className="px-5 pb-5 pl-[4.75rem] text-sm leading-relaxed text-white/65">{f.a}</p>}
              </div>
            );
          })}
          {shown.length === 0 && <p className="rounded-3xl border border-white/10 p-8 text-center text-white/45">No questions match your search.</p>}
        </div>
      </div>
    </div>
  );
}
