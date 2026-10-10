import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardLayout } from './components/DashboardLayout';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import ExploreCategories from './pages/ExploreCategories';
import FeaturedTasks from './pages/FeaturedTasks';
import Games from './pages/Games';
import FAQ from './pages/FAQ';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import AccountRecovery from './pages/auth/AccountRecovery';
import RegistrationSuccess from './pages/auth/RegistrationSuccess';
import Dashboard from './pages/dashboard/Dashboard';
import DashboardTasks from './pages/dashboard/Tasks';
import Wallet from './pages/dashboard/Wallet';
import MyTasks from './pages/dashboard/MyTasks';
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
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/explore" element={<ExploreCategories />} />
          <Route path="/tasks" element={<FeaturedTasks />} />
          <Route path="/games" element={<Games />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/recover" element={<AccountRecovery />} />
          <Route path="/welcome" element={<RegistrationSuccess />} />
        </Route>

        {/* User Dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/tasks" element={<DashboardTasks />} />
          <Route path="/dashboard/tasks/:id" element={<TaskDetails />} />
          <Route path="/dashboard/my-tasks" element={<MyTasks />} />
          <Route path="/dashboard/wallet" element={<Wallet />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/dashboard/games" element={<GamesHub />} />
          <Route path="/games/snake" element={<SnakeGame />} />
          <Route path="/games/memory" element={<MemoryMatch />} />
          <Route path="/games/reaction" element={<ReactionTest />} />
          <Route path="/games/trivia" element={<TriviaQuiz />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
