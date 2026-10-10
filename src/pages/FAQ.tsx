import { useState } from 'react';
import { Plus, Minus, Search, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';

const faqs = [
  { q: 'How do I earn tokens on Kredilo?', a: 'Complete eligible tasks and games. Rewards are credited after verification where required.' },
  { q: 'How long does task verification take?', a: 'Most tasks are reviewed within 24–48 hours. You’ll be notified of the outcome.' },
  { q: 'What happens if my submission is rejected?', a: 'You’ll see the reason and can often resubmit if the issue is correctable.' },
  { q: 'When can I request a withdrawal?', a: 'Once you reach the minimum of 10,000 tokens (₦1,000).' },
  { q: 'What payout methods are supported?', a: 'Bank transfer, USDT (TRC20), and PayPal (availability may vary by region).' },
  { q: 'How do I keep my account secure?', a: 'Use a strong password, enable any available 2FA, and never share your login details.' },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs mb-4">
            <span>?</span> Frequently Asked Questions
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">Got Questions?<br />We’ve Got Answers.</h1>
          <p className="mt-4 text-white/60">Find quick answers to common questions about earning tokens, task verification, withdrawals, account security and more.</p>
          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input placeholder="Search FAQs..." className="w-full bg-[#111] border border-white/10 rounded-full pl-12 pr-4 py-3 text-sm" />
          </div>
          <div className="mt-8 p-5 border border-white/10 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><Headphones size={18} /></div>
              <div>
                <div className="font-medium">Still need help?</div>
                <div className="text-sm text-white/60">Our support team is here to assist you.</div>
              </div>
            </div>
            <Link to="/contact" className="px-4 py-2 border border-white/20 rounded-full text-sm">Contact Support →</Link>
          </div>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-medium">{f.q}</span>
                {open === i ? <Minus size={18} /> : <Plus size={18} />}
              </button>
              {open === i && <div className="px-5 pb-5 text-sm text-white/60">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
