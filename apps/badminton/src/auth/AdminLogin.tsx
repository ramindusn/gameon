// Admin login — email magic link (ADR 0010). The link completes sign-in in the
// inbox, so on success we show a "check your email" confirmation. Under VITE_E2E
// the bypass resolves the role immediately and the app moves on.

import { useState, type FormEvent } from 'react'
import { Button, Field } from '@gameon/ui'
import { useAuth } from './useAuth'

export function AdminLogin() {
  const { signInAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      // Land the admin straight on their dashboard after the magic link.
      await signInAdmin(email, `${window.location.origin}/dashboard`)
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not send the link')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-fg" data-testid="admin-magic-link-sent">
        Magic link sent to <span className="font-medium">{email}</span>. Check your inbox
        to finish signing in.
      </p>
    )
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field
        label="Email"
        type="email"
        required
        placeholder="admin@badmintonduo.club"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        data-testid="admin-email"
      />
      {status === 'error' && (
        <p className="text-sm text-negative" data-testid="admin-login-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={status === 'sending'}
        data-testid="admin-magic-link-submit"
      >
        {status === 'sending' ? 'Sending…' : 'Send magic link'}
      </Button>
    </form>
  )
}
