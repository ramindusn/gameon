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
  // Return the underlying result so forms can surface auth errors (e.g. bad password).
  signInAdmin: (...args: Parameters<typeof signInAdmin>) => ReturnType<typeof signInAdmin>
  signInMatchmaker: (
    ...args: Parameters<typeof signInMatchmaker>
  ) => ReturnType<typeof signInMatchmaker>
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
        const result = await signInAdmin(email, emailRedirectTo)
        await refresh()
        return result
      },
      signInMatchmaker: async (username, password) => {
        const result = await signInMatchmaker(username, password)
        await refresh()
        return result
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
