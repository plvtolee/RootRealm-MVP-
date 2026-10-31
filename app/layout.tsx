import type { Metadata } from 'next'
import './globals.css'
import '@/components/phase2/RootRealmPhase2.css'
import '@/components/phase2/phase2-overrides.css'
import '@/components/phase3/Phase3.css'

export const metadata: Metadata = {
  title: 'RootRealm',
  description: 'A lightweight RPG-inspired progression app for developers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}