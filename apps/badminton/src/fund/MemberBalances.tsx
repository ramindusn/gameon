import { useState } from 'react'
import { Button, Card, Field, Modal } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { euro, memberBalances, nowLocalInput } from '@gameon/domain'
import { useAuth } from '../auth/useAuth'
import { useFund } from './useFund'

export function MemberBalances() {
  const { state, addMember } = useFund()
  const { role } = useAuth()
  const isAuthenticated = role === 'admin'
  const [addingMember, setAddingMember] = useState(false)

  const balances = memberBalances(state)

  return (
    <Card
      title="Member Balances (Cash)"
      icon={<Icon name="players" />}
      action={
        isAuthenticated ? (
          <Button data-testid="add-member-button" onClick={() => setAddingMember(true)}>
            + Add member
          </Button>
        ) : undefined
      }
    >
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {balances.map((b) => (
          <li
            key={b.id}
            className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
          >
            <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
              <span className="break-words font-semibold text-fg">{b.name}</span>
              <span
                className={`whitespace-nowrap text-base font-bold ${
                  b.left >= 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {euro(b.left)}
              </span>
            </div>
            <dl className="divide-y divide-line px-3 pb-2 text-sm">
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-xs uppercase tracking-wide text-fg-subtle">
                  Starting
                </dt>
                <dd className="font-medium text-fg">{euro(b.starting)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <dt className="text-xs uppercase tracking-wide text-fg-subtle">
                  Spent (split)
                </dt>
                <dd className="font-medium text-fg">{euro(b.spent)}</dd>
              </div>
            </dl>
          </li>
        ))}
        {balances.length === 0 && (
          <li className="py-3 text-sm text-fg-muted">No members yet.</li>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fg-muted">
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 pr-3 font-medium">Starting</th>
              <th className="py-2 pr-3 font-medium">Spent (split)</th>
              <th className="py-2 pr-3 font-medium">Left</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id} className="border-b border-line hover:bg-surface-muted">
                <td className="py-2 pr-3 font-semibold text-fg">{b.name}</td>
                <td className="py-2 pr-3 text-fg-muted">{euro(b.starting)}</td>
                <td className="py-2 pr-3 text-fg-muted">{euro(b.spent)}</td>
                <td
                  className={`py-2 pr-3 font-bold ${b.left >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                >
                  {euro(b.left)}
                </td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-fg-muted">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-fg-subtle">
        Spending — net of game-day usage income — is split equally across all current
        members, so these balances always add up to the remaining fund. Record incoming
        cash via
        <span className="font-medium"> + Add transaction</span> in the header.
      </p>

      {addingMember && (
        <AddMemberModal
          onClose={() => setAddingMember(false)}
          onSave={(name, cash, when, email) => {
            addMember(name, cash, when, email)
            setAddingMember(false)
          }}
        />
      )}
    </Card>
  )
}

function AddMemberModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (name: string, cash: number, when: string, email?: string) => void
}) {
  const [name, setName] = useState('')
  const [cash, setCash] = useState('')
  const [when, setWhen] = useState(nowLocalInput())
  const [email, setEmail] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, Number(cash) || 0, when, email.trim() || undefined)
  }

  return (
    <Modal open title="Add a member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Kasun"
        />
        <Field
          label="Login email (optional — links 'Logged by')"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
        />
        <Field
          label="Initial cash into fund (€)"
          type="number"
          min={0}
          step="0.01"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          placeholder="0.00"
        />
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add member</Button>
        </div>
      </form>
    </Modal>
  )
}
