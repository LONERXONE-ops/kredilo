import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl font-bold mb-4">404</div>
      <h1 className="text-2xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-white/60 mb-6">The page you’re looking for doesn’t exist or has been moved.</p>
      <Link to="/" className="bg-white text-black px-6 py-3 rounded-full font-semibold">Go Home</Link>
    </div>
  );
}
