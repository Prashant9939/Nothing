import { Suspense, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { PageSkeleton } from './ui';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main key={location.pathname} className="flex-1 animate-page-in">
        {/* Without this boundary a lazy page chunk suspends all the way up to
            the top-level <Suspense>, which replaces the navbar and footer with
            a full-screen spinner. The shell now stays put and only the content
            area shows a placeholder. */}
        <Suspense fallback={<PageSkeleton label="Loading page..." />}>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
