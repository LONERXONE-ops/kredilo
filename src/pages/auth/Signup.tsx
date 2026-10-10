import { Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export default function Signup() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-8">
      <div className="border border-white/10 rounded-3xl p-8 bg-[#111]">
        <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs mb-4">Create Account</div>
        <h1 className="text-3xl font-bold mb-2">Sign Up</h1>
        <p className="text-white/60 text-sm mb-8">Join Kredilo today and start completing tasks, playing games, and earning tokens.</p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = '/welcome'; }}>
          <div>
            <label className="text-sm mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="email" required placeholder="Enter your email address" className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="password" required minLength={8} placeholder="Create a password" className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm" />
            </div>
            <p className="text-xs text-white/40 mt-1">Password must be at least 8 characters long.</p>
          </div>
          <div>
            <label className="text-sm mb-1 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="password" required placeholder="Confirm your password" className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-white text-black py-3 rounded-full font-semibold">Create Account →</button>
          <div className="text-center text-sm text-white/40">or</div>
          <button type="button" className="w-full border border-white/20 py-3 rounded-full text-sm">Continue with Google</button>
          <p className="text-center text-sm text-white/60">Already have an account? <Link to="/login" className="text-white hover:underline">Log In</Link></p>
        </form>
      </div>
      <div className="hidden lg:flex border border-white/10 rounded-3xl p-8 bg-[#111] flex-col justify-center">
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-3xl">👤+</div>
        <h2 className="text-2xl font-bold mb-2">Start Your Kredilo Journey</h2>
        <p className="text-white/60 text-sm mb-8">Create your account in minutes and get access to tasks, games, rewards and more.</p>
        <ul className="space-y-4 text-sm">
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">⚡</span> Complete simple tasks</li>
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">🎮</span> Play fun games</li>
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">🪙</span> Earn tokens</li>
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">→</span> Request withdrawals</li>
        </ul>
      </div>
    </div>
  );
}
