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
