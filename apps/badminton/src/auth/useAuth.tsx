// React binding over @gameon/supabase auth: resolves the current role and
// exposes sign-in/out. Login screens (TASK-2.4/2.5) consume this hook.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  resolveRole,
  signInAdmin,
  signInMatchmaker,
  signOut as signOutModule,
  type Role,
} from '@gameon/supabase'

type AuthContextValue = {
  role: Role
  loading: boolean
  refresh: () => Promise<void>
  signInAdmin: (email: string, emailRedirectTo?: string) => Promise<void>
  signInMatchmaker: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setRole(await resolveRole())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({
      role,
      loading,
      refresh,
      signInAdmin: async (email, emailRedirectTo) => {
        await signInAdmin(email, emailRedirectTo)
        await refresh()
      },
      signInMatchmaker: async (username, password) => {
        await signInMatchmaker(username, password)
        await refresh()
      },
      signOut: async () => {
        await signOutModule()
        await refresh()
      },
    }),
    [role, loading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
