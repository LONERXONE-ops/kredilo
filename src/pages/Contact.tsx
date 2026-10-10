import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const field = 'w-full rounded-2xl border border-white/20 bg-black/40 px-4 text-sm outline-none placeholder:text-white/35 focus:border-white/50';

export default function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto max-w-xl px-5 py-12 sm:px-6 lg:py-16">
        <span className="inline-block rounded-full border border-white/25 px-4 py-1.5 text-sm font-bold">Support</span>
        <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Contact Us</h1>
        <p className="mt-4 text-lg text-white/60">Have a question or need help? Send us a message.</p>
        <form
          className="mt-8 space-y-4 rounded-[2rem] border border-white/15 bg-[#0b0b0b]/80 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <input required placeholder="Your name" className={`${field} h-12`} />
          <input required type="email" placeholder="Your email" className={`${field} h-12`} />
          <textarea required rows={5} placeholder="How can we help?" className={`${field} py-3`} />
          <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black hover:bg-white/90">
            Send Message <ArrowRight size={18} />
          </button>
          {sent && (
            <p role="status" className="rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
              Demo mode: your message was not sent. Support will be connected once the backend and email are ready.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
