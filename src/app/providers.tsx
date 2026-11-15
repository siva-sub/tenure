import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadPreferences, savePreferences, type Preferences } from '@/data/api'
import { Toaster } from '@/components/Toaster'

/* ------------------------------------------------------------------ */
/* Server state                                                        */
/* ------------------------------------------------------------------ */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // A missing record is not going to appear on retry.
        if (error instanceof Error && error.name === 'NotFoundError') return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/* ------------------------------------------------------------------ */
/* Preferences — the property in focus, density, strictness             */
/* ------------------------------------------------------------------ */

interface PreferencesContextValue {
  prefs: Preferences
  setPrefs: (patch: Partial<Preferences>) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function initialPreferences(): Preferences {
  const stored = loadPreferences()
  // A ?home= link wins over the stored preference, so a shared record opens
  // the record it names.
  if (typeof window !== 'undefined') {
    const requested = new URLSearchParams(window.location.search).get('home')
    if (requested) return { ...stored, activePropertyId: requested }
  }
  return stored
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside <Providers>')
  return ctx
}

export function Providers({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<Preferences>(initialPreferences)

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefsState((current) => {
      const next = { ...current, ...patch }
      savePreferences(next)
      return next
    })
  }, [])

  // Reflect density on the root element so tokens can respond.
  useEffect(() => {
    document.documentElement.dataset['density'] = prefs.density
  }, [prefs.density])

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs])

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesContext.Provider value={value}>
        {children}
        <Toaster />
      </PreferencesContext.Provider>
    </QueryClientProvider>
  )
}
