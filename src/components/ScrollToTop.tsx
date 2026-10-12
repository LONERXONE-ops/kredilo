import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Resets the scroll position to the top whenever the route changes, so a new page
// never opens half-scrolled from the previous one.
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
