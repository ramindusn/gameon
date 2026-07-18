import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cx } from '../cx'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastApi {
  /** Show a toast; defaults to the 'info' variant. */
  toast: (message: string, variant?: ToastVariant) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS = 4000

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-positive/40 text-fg',
  error: 'border-negative/50 text-fg',
  info: 'border-line text-fg',
}

const variantIcon: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const variantIconColor: Record<ToastVariant, string> = {
  success: 'text-positive',
  error: 'text-negative',
  info: 'text-fg-muted',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Mirror of `toasts` for reads inside callbacks without re-subscribing them.
  const toastsRef = useRef<Toast[]>([])
  toastsRef.current = toasts
  const nextId = useRef(0)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current[id]
    if (timer) {
      clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      // Coalesce repeats: rapid identical toasts (e.g. scoring several courts in
      // a row) refresh the visible one instead of stacking a pile that covers
      // the content underneath.
      const existing = toastsRef.current.find(
        (t) => t.message === message && t.variant === variant,
      )
      if (existing) {
        const timer = timers.current[existing.id]
        if (timer) clearTimeout(timer)
        timers.current[existing.id] = setTimeout(() => dismiss(existing.id), AUTO_DISMISS_MS)
        return
      }
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, variant }])
      timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout)
    },
    [],
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast: (message, variant = 'info') => push(message, variant),
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* bottom-20 on mobile clears the fixed bottom tab bar; sm+ has no tab bar. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 text-sm shadow-lg motion-safe:animate-[popIn_140ms_ease-out]',
              variantStyles[t.variant],
            )}
          >
            <span aria-hidden className={cx('mt-0.5 font-semibold', variantIconColor[t.variant])}>
              {variantIcon[t.variant]}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-fg-muted hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-line"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Access the toast API. Must be used within a <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
