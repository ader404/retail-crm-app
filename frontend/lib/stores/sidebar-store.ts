import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggle: () => void
  openMobile: () => void
  closeMobile: () => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: false,
  isMobileOpen: false,
  toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  openMobile: () => set({ isMobileOpen: true }),
  closeMobile: () => set({ isMobileOpen: false }),
}))
