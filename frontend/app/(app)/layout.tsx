import { Sidebar } from '@/components/layout/sidebar'
import ProtectedRoute from '@/components/auth/protected-route'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
