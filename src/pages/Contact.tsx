import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/auth';

const field = 'w-full rounded-2xl border border-white/20 bg-black/40 px-4 text-sm outline-none transition placeholder:text-white/35 focus:border-white/50';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await apiRequest('/api/contact', { name, email, message });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-xl px-5 py-12 sm:px-6 lg:py-16">
        <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">Support</span>
        <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Contact Us</h1>
        <p className="mt-4 text-lg text-white/60">Have a question or need help? Send us a message and we’ll get back to you by email.</p>

        {sent ? (
          <div className="mt-8 rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"><Check size={28} /></div>
            <h2 className="mt-4 text-xl font-extrabold">Message sent</h2>
            <p className="mt-1.5 text-sm text-white/60">Thanks for reaching out — we’ll reply to <span className="font-semibold text-white">{email}</span> as soon as we can.</p>
            <button
              onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); }}
              className="pressable mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-6 text-sm font-bold hover:bg-white/5"
            >
              Send another
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-4 rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 p-6" onSubmit={submit}>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={`${field} h-12`} />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className={`${field} h-12`} />
            <textarea required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="How can we help?" className={`${field} py-3`} />
            {error && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={busy || !name || !email || !message}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90 disabled:opacity-50"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} Send Message <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
