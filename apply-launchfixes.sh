#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d src ]; then echo "Run this from your ~/kredilo folder"; exit 1; fi
echo "Writing files..."
mkdir -p "$(dirname "src/App.tsx")"
cat > "src/App.tsx" <<'KREDILO_EOF_5521'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import PostTask from './pages/dashboard/PostTask';
import AdminPayments from './pages/admin/AdminPayments';
import { DashboardLayout } from './components/DashboardLayout';
import Home from './pages/Home';
import { AuthProvider } from './lib/auth';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import HowItWorks from './pages/HowItWorks';
import Games from './pages/Games';
import FAQ from './pages/FAQ';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AccountRecovery from './pages/auth/AccountRecovery';
import RegistrationSuccess from './pages/auth/RegistrationSuccess';
import Dashboard from './pages/dashboard/Dashboard';
import Wallet from './pages/dashboard/Wallet';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import TaskDetails from './pages/dashboard/TaskDetails';
import GamesHub from './pages/dashboard/GamesHub';
import SnakeGame from './pages/games/Snake';
import MemoryMatch from './pages/games/MemoryMatch';
import ReactionTest from './pages/games/ReactionTest';
import TriviaQuiz from './pages/games/TriviaQuiz';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import RewardPolicy from './pages/RewardPolicy';
import { AdminLayout } from './components/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminTasks from './pages/admin/AdminTasks';
import AdminFunding from './pages/admin/AdminFunding';
import AdminTeam from './pages/admin/AdminTeam';
import AcceptInvite from './pages/admin/AcceptInvite';
import AdminSection from './pages/admin/AdminSection';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLedger from './pages/admin/AdminLedger';
import AdminAudit from './pages/admin/AdminAudit';
import AdminFraud from './pages/admin/AdminFraud';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/explore" element={<Navigate to="/signup" replace />} />
          <Route path="/tasks" element={<Navigate to="/signup" replace />} />
          <Route path="/games" element={<Games />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/rewards-policy" element={<RewardPolicy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/recover" element={<AccountRecovery />} />
          <Route path="/welcome" element={<RegistrationSuccess />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin-invite" element={<AcceptInvite />} />
        </Route>

        {/* User Dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tasks" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard/tasks/:id" element={<TaskDetails />} />
          <Route path="/dashboard/my-tasks" element={<Navigate to="/dashboard?tab=mine" replace />} />
          <Route path="/dashboard/wallet" element={<Wallet />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/dashboard/post" element={<PostTask />} />
          <Route path="/dashboard/games" element={<GamesHub />} />
          <Route path="/games/snake" element={<SnakeGame />} />
          <Route path="/games/memory" element={<MemoryMatch />} />
          <Route path="/games/reaction" element={<ReactionTest />} />
          <Route path="/games/trivia" element={<TriviaQuiz />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="tasks" element={<AdminTasks />} />
          <Route path="submissions" element={<AdminSubmissions />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="funding" element={<AdminFunding />} />
          <Route path="ledger" element={<AdminLedger />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="fraud" element={<AdminFraud />} />
          <Route path="team" element={<AdminTeam />} />
          <Route path=":section" element={<AdminSection />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter></AuthProvider>
  );
}

export default App;
KREDILO_EOF_5521
echo "  src/App.tsx"
mkdir -p "$(dirname "src/pages/FAQ.tsx")"
cat > "src/pages/FAQ.tsx" <<'KREDILO_EOF_5521'
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coins, CreditCard, Headphones, Lock, Minus, Plus, Search, ShieldCheck, Wallet, CircleX } from 'lucide-react';

const faqs = [
  { icon: Coins, q: 'How do I earn kreds on Kredilo?', a: 'Complete eligible tasks and play built-in games. Tokens are credited only after a task or game completion is verified against its rules. Nothing is guaranteed, and not every attempt earns a reward.' },
  { icon: ShieldCheck, q: 'How long does task verification take?', a: 'It depends on the task. Some, like built-in games, can be checked automatically. Others need manual review. You can follow the status of each task under My Tasks on your dashboard.' },
  { icon: CircleX, q: 'What happens if my submission is rejected?', a: 'You will see the reason for the rejection. No kreds are credited for a rejected submission.' },
  { icon: Wallet, q: 'When can I request a withdrawal?', a: 'Withdrawals open on a date set by Kredilo. The minimum is 2,000 kreds (₦1,000), at 100 kreds = ₦50. This rate is provisional. We will announce clearly when withdrawals open.' },
  { icon: CreditCard, q: 'What payout methods are supported?', a: 'Bank transfer. You withdraw your kreds as Naira straight to your Nigerian bank account. Withdrawals open on a date announced in the app, with a minimum of 2,000 kreds (₦1,000).' },
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
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Frequently Asked Questions</span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">Got Questions? We’ve Got Answers.</h1>
          <p className="mt-5 max-w-md text-lg text-white/60">
            Quick answers about earning kreds, task verification, withdrawals and account security.
          </p>
          <div className="relative mt-8">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="h-14 w-full rounded-full border border-white/20 bg-black/40 pl-12 pr-4 text-sm outline-none transition placeholder:text-white/35 focus:border-emerald-400/50"
            />
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-[1.75rem] border border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Headphones size={26} /></span>
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
              <div key={f.q} className={`rounded-3xl border bg-white/[0.02] transition ${isOpen ? 'border-emerald-400/25' : 'border-white/15'}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : f.i)}
                  aria-expanded={isOpen}
                  className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${isOpen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10'}`}><f.icon size={20} /></span>
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
KREDILO_EOF_5521
echo "  src/pages/FAQ.tsx"
mkdir -p "$(dirname "src/components/ErrorBoundary.tsx")"
cat > "src/components/ErrorBoundary.tsx" <<'KREDILO_EOF_5521'
import { Component, type ErrorInfo, type ReactNode } from 'react';

// Catches render-time crashes anywhere in the app and shows a friendly screen
// instead of a blank white page. Users can reload without losing the whole app.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-6 text-center text-white">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="text-2xl font-extrabold">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-white/60">
            Sorry about that. Please reload the page — if it keeps happening, try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 min-h-12 rounded-full bg-emerald-500 px-7 text-sm font-bold text-black transition hover:bg-emerald-400"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
KREDILO_EOF_5521
echo "  src/components/ErrorBoundary.tsx"
mkdir -p "$(dirname "src/main.tsx")"
cat > "src/main.tsx" <<'KREDILO_EOF_5521'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
KREDILO_EOF_5521
echo "  src/main.tsx"
echo
echo "Building frontend to verify..."
npm run build
echo
echo "✅ Build OK — launch fixes applied. Now: git add -A && git commit -m \"fix: hide mock pages, fix FAQ payout copy, add error boundary\" && git push"
