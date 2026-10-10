import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/explore', label: 'Explore Tasks' },
  { to: '/games', label: 'Games' },
  { to: '/faq', label: 'FAQ' },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-black text-sm">
        K
      </div>
      <span>kredilo</span>
    </Link>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  location.pathname === l.to ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium hover:text-white/80">Log In</Link>
            <Link to="/signup" className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition">
              Sign Up
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0a0a0a] px-4 py-4 space-y-2">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block py-2 text-sm">
                {l.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <Link to="/login" className="py-2 text-center text-sm">Log In</Link>
              <Link to="/signup" className="bg-white text-black py-2.5 rounded-full text-center text-sm font-semibold">Sign Up</Link>
            </div>
          </div>
        )}
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-20 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 text-white/60 max-w-xs">
            Kredilo is a task-to-earn platform where you complete simple activities, earn tokens, and get rewarded.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">About</h4>
          <ul className="space-y-2 text-white/60">
            <li><Link to="/about" className="hover:text-white">About Kredilo</Link></li>
            <li><Link to="/how-it-works" className="hover:text-white">How It Works</Link></li>
            <li><Link to="/explore" className="hover:text-white">Explore Tasks</Link></li>
            <li><Link to="/games" className="hover:text-white">Games</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help & Support</h4>
          <ul className="space-y-2 text-white/60">
            <li><Link to="/faq" className="hover:text-white">Help Centre</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-white/60">
            <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        © 2025 Kredilo. All rights reserved. · Nigeria
      </div>
    </footer>
  );
}
