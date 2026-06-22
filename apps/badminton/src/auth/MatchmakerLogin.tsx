// Matchmaker login — username + password (ADR 0010). No self-service signup:
// Matchmaker accounts are created by an Admin/Matchmaker, so this is sign-in only.

import { useState, type FormEvent } from 'react'
import { Button, Field } from '@gameon/ui'
import { useAuth } from './useAuth'

export function MatchmakerLogin() {
  const { signInMatchmaker } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setError('')
    try {
      const result = await signInMatchmaker(username, password)
      // On success the provider refresh flips the role and the app moves on.
      if (result?.error) {
        setStatus('error')
        setError(result.error.message)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not sign in')
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <Field
        label="Username"
        autoComplete="username"
        required
        placeholder="rohan"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        data-testid="mm-username"
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="mm-password"
      />
      {status === 'error' && (
        <p className="text-sm text-negative" data-testid="mm-login-error">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={status === 'submitting'}
        data-testid="mm-login-submit"
      >
        {status === 'submitting' ? 'Signing in…' : 'Log in'}
      </Button>
      <p className="text-xs text-fg-muted">
        Players don’t sign in. Matchmaker accounts are created by an admin.
      </p>
    </form>
  )
}
