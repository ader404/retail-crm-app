import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { LocaleProvider } from '@/components/providers/locale-provider'
import { Providers } from '@/components/providers/query-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from 'sonner'

const inter = { className: 'font-inter' }

export const metadata: Metadata = {
  title: 'Retail CRM',
  description: 'Retail CRM, POS & Inventory Management',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LocaleProvider>
            <AuthProvider>
              <Providers>
                {children}
                <Toaster richColors position="top-right" />
              </Providers>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
