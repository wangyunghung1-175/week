// app/layout.tsx — Server Component (no 'use client')
import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: '雙福輔導團 · 工作週報系統',
  description: '工作週報時數登錄與團隊彙整系統',
  manifest: '/manifest.json',
  themeColor: '#1a3a5c',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a3a5c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

// inline import of client shell
import AppShell from './AppShell';
