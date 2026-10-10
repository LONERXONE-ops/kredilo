import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="relative overflow-hidden">
      <div className="light-beam pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[60%]" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center">
        <div className="text-8xl font-extrabold text-white/20">404</div>
        <h1 className="mt-2 text-4xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-white/60">The page you’re looking for doesn’t exist or has moved.</p>
        <Link to="/" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-black hover:bg-white/90">
          Back to Home <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
