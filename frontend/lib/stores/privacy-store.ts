import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrivacyStore {
  hideNumbers: boolean
  toggleHideNumbers: () => void
}

export const usePrivacyStore = create<PrivacyStore>()(
  persist(
    (set) => ({
      hideNumbers: false,
      toggleHideNumbers: () => set((state) => ({ hideNumbers: !state.hideNumbers })),
    }),
    {
      name: 'privacy-store',
    }
  )
)
