'use client'

import * as React from 'react'
import { AuthSessionProvider } from './session-provider'

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>{children}</AuthSessionProvider>
  )
}
