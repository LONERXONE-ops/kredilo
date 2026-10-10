import { Mail } from 'lucide-react';

export default function Contact() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
      <p className="text-white/60 mb-8">Have a question or need support? Send us a message.</p>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Demo: Message would be sent to support.'); }}>
        <input type="text" required placeholder="Your name" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm" />
        <input type="email" required placeholder="Your email" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm" />
        <textarea required placeholder="How can we help?" rows={5} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm" />
        <button type="submit" className="bg-white text-black px-6 py-3 rounded-full font-semibold">Send Message</button>
      </form>
      <p className="mt-6 text-sm text-white/40 flex items-center gap-2"><Mail size={16} /> support@kredilo.example (placeholder)</p>
    </div>
  );
}
