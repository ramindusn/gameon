import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Field, Modal } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useAuth } from '../auth/useAuth'
import { useRoster, useRosterMutations } from '../roster/useRoster'
import type { MatchmakerInput, Player, PlayerInput } from '../roster/api'

// Roster management (E02 / TASK-3.2). Admins & Matchmakers add/edit/remove
// players (name + skill + absent). Plain players have no login; matchmakers do.
export function PlayersPage() {
  const { role } = useAuth()
  const { data, isLoading, isError } = useRoster()
  const players = data?.players ?? []
  const m = useRosterMutations(data?.clubId)
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [addingMatchmaker, setAddingMatchmaker] = useState(false)

  return (
    <AppShell title="Players">
      <div data-testid="players">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-fg-muted">{players.length} in the roster</p>
          <div className="flex gap-2">
            {role === 'admin' && (
              <Button
                variant="secondary"
                onClick={() => setAddingMatchmaker(true)}
                data-testid="add-matchmaker-button"
              >
                + Add matchmaker
              </Button>
            )}
            <Button onClick={() => setEditing('new')} data-testid="add-player-button">
              + Add player
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-fg-muted">Loading roster…</p>}
        {isError && <p className="text-sm text-negative">Could not load the roster.</p>}

        <Card title="Roster" icon="🏸">
          {players.length === 0 ? (
            <p className="text-sm text-fg-muted">No players yet. Add the first one.</p>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <ul className="space-y-3 sm:hidden">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-line bg-surface px-3 py-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/players/${p.id}`}
                        className="font-semibold text-fg hover:text-accent-strong"
                      >
                        {p.nickname}
                      </Link>
                      <Badges player={p} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm text-fg-muted">
                      <span>Skill: {p.skill ?? '—'}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          className="px-2 py-1"
                          onClick={() => setEditing(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 py-1 text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm(`Remove ${p.nickname}?`)) m.remove.mutate(p.id)
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-fg-muted">
                      <th className="py-2 pr-3 font-medium">Player</th>
                      <th className="py-2 pr-3 font-medium">Skill</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-line hover:bg-surface-muted"
                      >
                        <td className="py-2 pr-3 font-semibold">
                          <Link
                            to={`/players/${p.id}`}
                            className="text-fg hover:text-accent-strong"
                          >
                            {p.nickname}
                          </Link>
                        </td>
                        <td className="py-2 pr-3 text-fg-muted">{p.skill ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <Badges player={p} />
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              className="px-2 py-1"
                              onClick={() => setEditing(p)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-red-500 hover:bg-red-500/10"
                              onClick={() => {
                                if (confirm(`Remove ${p.nickname}?`))
                                  m.remove.mutate(p.id)
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {editing && (
        <PlayerModal
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing === 'new') m.add.mutate(input)
            else m.update.mutate({ id: editing.id, input })
            setEditing(null)
          }}
        />
      )}

      {addingMatchmaker && (
        <MatchmakerModal
          onClose={() => setAddingMatchmaker(false)}
          onSave={(input) =>
            m.createMatchmaker.mutate(input, {
              onSuccess: () => setAddingMatchmaker(false),
            })
          }
          pending={m.createMatchmaker.isPending}
          error={
            m.createMatchmaker.error instanceof Error
              ? m.createMatchmaker.error.message
              : ''
          }
        />
      )}
    </AppShell>
  )
}

function MatchmakerModal({
  onClose,
  onSave,
  pending,
  error,
}: {
  onClose: () => void
  onSave: (input: MatchmakerInput) => void
  pending: boolean
  error: string
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || password.length < 6) {
      setLocalError('Username and a password (min 6 chars) are required.')
      return
    }
    setLocalError('')
    onSave({ name: name.trim() || username.trim(), username: username.trim(), password })
  }

  return (
    <Modal open title="Add matchmaker" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rohan"
          data-testid="mm-name"
        />
        <Field
          label="Username (login)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          placeholder="rohan"
          autoComplete="off"
          data-testid="mm-new-username"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          data-testid="mm-new-password"
        />
        {(localError || error) && (
          <p className="text-sm font-medium text-red-500" data-testid="mm-create-error">
            {localError || error}
          </p>
        )}
        <p className="text-xs text-fg-subtle">
          Creates a Matchmaker login (a player who can build draws and add players).
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} data-testid="mm-create-submit">
            {pending ? 'Creating…' : 'Create matchmaker'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Badges({ player }: { player: Player }) {
  return (
    <span className="flex gap-1">
      {player.isMatchmaker && (
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-strong">
          Matchmaker
        </span>
      )}
      {player.absent && (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
          Absent
        </span>
      )}
    </span>
  )
}

function PlayerModal({
  player,
  onClose,
  onSave,
}: {
  player: Player | null
  onClose: () => void
  onSave: (input: PlayerInput) => void
}) {
  const isEdit = player !== null
  const [nickname, setNickname] = useState(player?.nickname ?? '')
  const [skill, setSkill] = useState(player?.skill != null ? String(player.skill) : '')
  const [absent, setAbsent] = useState(player?.absent ?? false)
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Name is required.')
      return
    }
    onSave({ nickname, skill: skill === '' ? null : Number(skill), absent })
  }

  return (
    <Modal open title={isEdit ? 'Edit player' : 'Add player'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Name"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoFocus
          placeholder="e.g. SmashKing"
          data-testid="player-name"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-fg-muted">Skill (1–5)</span>
          <select
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            data-testid="player-skill"
          >
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={absent}
            onChange={(e) => setAbsent(e.target.checked)}
            data-testid="player-absent"
          />
          Absent (excluded from draws)
        </label>
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" data-testid="player-save">
            {isEdit ? 'Save' : 'Add player'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
