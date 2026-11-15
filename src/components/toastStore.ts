import { useSyncExternalStore } from 'react'

/**
 * Toasts as a tiny external store.
 *
 * Deliberately not React state: mutations resolve outside the component tree
 * (in `onSuccess` handlers and error paths), and they should be able to raise a
 * toast without threading a context through. `useSyncExternalStore` keeps the
 * subscription correct under concurrent rendering.
 */

export interface Toast {
  id: string
  title: string
  body?: string
  tone?: 'default' | 'warn' | 'bad'
}

let toasts: Toast[] = []
const listeners = new Set<() => void>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function emit(): void {
  for (const listener of listeners) listener()
}

function dismiss(id: string): void {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function toast(input: Omit<Toast, 'id'>): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  toasts = [...toasts, { ...input, id }]
  emit()
  timers.set(
    id,
    setTimeout(() => dismiss(id), input.tone === 'bad' ? 9000 : 6000),
  )
  return id
}

export { dismiss as dismissToast }

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Toast[] {
  return toasts
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
