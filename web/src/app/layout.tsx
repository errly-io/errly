import '@mantine/core/styles.css';
import React from 'react';
import { AppProviders } from './providers';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

// Force dynamic rendering to avoid Html import issues
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Errly',
  description: 'Issue tracker for modern teams',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <PerformanceMonitor />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
