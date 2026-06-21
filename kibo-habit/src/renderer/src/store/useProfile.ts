import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '../types'

interface ProfileState {
  profiles: Profile[]
  activeId: number | null
  setProfiles: (p: Profile[]) => void
  setActive: (id: number) => void
  upsertProfile: (p: Profile) => void
  removeProfile: (id: number) => void
  getActive: () => Profile | undefined
}

/**
 * Store de perfis. Persistido em localStorage pra lembrar qual perfil
 * o usuário tava usando entre sessões.
 *
 * activeId é o ID numérico do banco (não slug), porque profiles podem
 * ser criados com slug custom (ex: "estudos-2026", "tcc-2") e o ID é
 * estável. Slug pode mudar.
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeId: null,
      setProfiles: (profiles) => set({ profiles }),
      setActive: (id) => set({ activeId: id }),
      upsertProfile: (p) =>
        set((s) => {
          const idx = s.profiles.findIndex((x) => x.id === p.id)
          if (idx === -1) return { profiles: [...s.profiles, p] }
          const next = s.profiles.slice()
          next[idx] = p
          return { profiles: next }
        }),
      removeProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
      getActive: () => get().profiles.find((p) => p.id === get().activeId)
    }),
    {
      name: 'kuxy.profile',
      partialize: (s) => ({ activeId: s.activeId })
    }
  )
)