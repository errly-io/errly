'use client';

import { MantineProvider } from '@mantine/core';
import React from 'react';

interface AppProvidersProps {
  readonly children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MantineProvider defaultColorScheme="light">
      {/* ColorSchemeScript should be in <head>, but MantineProvider is needed here */}
      {/* We'll keep ColorSchemeScript in layout.tsx since it renders on server in head */}
      {children}
    </MantineProvider>
  );
} 