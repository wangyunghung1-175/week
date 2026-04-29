'use client';
// app/page.tsx — redirect to /weekly
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.history.replaceState({}, '', '/weekly');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  return null;
}
