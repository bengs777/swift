'use client'

import * as React from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthSessionProvider } from './session-provider'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthSessionProvider>
        {children}
      </AuthSessionProvider>
    </ThemeProvider>
  )
}
