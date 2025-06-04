"use client"
import { BasicAppShell } from '@/modules/shared/components/AppShell/AppShell';
import { MantineProvider } from '@mantine/core';
import { SessionProvider } from 'next-auth/react';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <SessionProvider>
      <MantineProvider>
        <BasicAppShell>
          {children}
        </BasicAppShell>
      </MantineProvider>
    </SessionProvider>
  )
}