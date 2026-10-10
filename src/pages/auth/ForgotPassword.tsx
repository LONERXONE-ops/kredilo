import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function ForgotPassword() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-8">
      <div className="border border-white/10 rounded-3xl p-8 bg-[#111]">
        <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs mb-4">Forgot Password</div>
        <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
        <p className="text-white/60 text-sm mb-8">Enter your email address and we’ll send you a link to reset your password.</p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Demo: Reset link would be sent (backend not connected).'); }}>
          <div>
            <label className="text-sm mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="email" required placeholder="Enter your email address" className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-white text-black py-3 rounded-full font-semibold">Send Reset Link →</button>
          <div className="text-center text-sm text-white/40">or</div>
          <button type="button" className="w-full border border-white/20 py-3 rounded-full text-sm">Continue with Google</button>
          <p className="text-center text-sm text-white/60">Remember your password? <Link to="/login" className="text-white hover:underline">Log In</Link></p>
        </form>
      </div>
      <div className="hidden lg:flex border border-white/10 rounded-3xl p-8 bg-[#111] flex-col justify-center">
        <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-3xl">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Don’t Worry, We’ve Got You.</h2>
        <p className="text-white/60 text-sm mb-8">Resetting your password is quick and easy. You’ll get a secure link sent to your email address.</p>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">1</span> Check your email</li>
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">2</span> Click the link</li>
          <li className="flex gap-3"><span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs">3</span> Set a new password</li>
        </ol>
      </div>
    </div>
  );
}
