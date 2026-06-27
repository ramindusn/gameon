import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Field, Modal, SkeletonCard, useConfirm } from '@gameon/ui'
import { AppShell } from '../app/AppShell'
import { useAuth } from '../auth/useAuth'
import { useRoster, useRosterMutations } from '../roster/useRoster'
import type { Gender, MatchmakerInput, Player, PlayerInput } from '../roster/api'

// Roster management (E02 / TASK-3.2). Admins & Matchmakers add/edit/remove
// players (name + skill + absent). Plain players have no login; matchmakers do.
export function PlayersPage() {
  const { role } = useAuth()
  const { data, isLoading, isError } = useRoster()
  const players = data?.players ?? []
  const m = useRosterMutations(data?.clubId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Player | 'new' | null>(null)

  const confirmRemove = async (p: Player) => {
    const ok = await confirm({
      title: 'Remove player',
      message: `Remove ${p.nickname} from the roster? This can't be undone.`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (ok) m.remove.mutate(p.id)
  }
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
                Make matchmaker
              </Button>
            )}
            <Button onClick={() => setEditing('new')} data-testid="add-player-button">
              + Add player
            </Button>
          </div>
        </div>

        {isLoading && <SkeletonCard rows={6} />}
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
                      <span className="capitalize">
                        Skill {p.skill ?? '—'} · {p.gender ?? '—'}
                      </span>
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
                          onClick={() => void confirmRemove(p)}
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
                      <th className="py-2 pr-3 font-medium">Gender</th>
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
                        <td className="py-2 pr-3 capitalize text-fg-muted">
                          {p.gender ?? '—'}
                        </td>
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
                              onClick={() => void confirmRemove(p)}
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
          pending={m.add.isPending || m.update.isPending}
          saveError={
            (editing === 'new' ? m.add.error : m.update.error) instanceof Error
              ? ((editing === 'new' ? m.add.error : m.update.error) as Error).message
              : ''
          }
          onSave={(input) => {
            // Close only after the write actually lands, so a failed save (e.g.
            // blocked by RLS) keeps the modal open with its error visible.
            const onDone = { onSuccess: () => setEditing(null) }
            if (editing === 'new') m.add.mutate(input, onDone)
            else m.update.mutate({ id: editing.id, input }, onDone)
          }}
        />
      )}

      {addingMatchmaker && (
        <MatchmakerModal
          players={players.filter((p) => !p.isMatchmaker)}
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
  players,
  onClose,
  onSave,
  pending,
  error,
}: {
  players: Player[]
  onClose: () => void
  onSave: (input: MatchmakerInput) => void
  pending: boolean
  error: string
}) {
  const [playerId, setPlayerId] = useState('')
  const [username, setUsername] = useState('')
  const [usernameEdited, setUsernameEdited] = useState(false)
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  // A login handle from the player's name: lowercase, alphanumeric only.
  const suggestUsername = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId) {
      setLocalError('Pick a player to promote.')
      return
    }
    if (!username.trim() || password.length < 6) {
      setLocalError('Username and a password (min 6 chars) are required.')
      return
    }
    setLocalError('')
    onSave({ playerId, username: username.trim(), password })
  }

  return (
    <Modal open title="Make a player a matchmaker" onClose={onClose}>
      {players.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted" data-testid="mm-no-players">
            Every player is already a matchmaker (or there are no players yet). Add a
            player first.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-fg-muted">Player to promote</span>
            <select
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              value={playerId}
              onChange={(e) => {
                const id = e.target.value
                setPlayerId(id)
                // Suggest a username from the chosen player (unless edited).
                if (!usernameEdited) {
                  const p = players.find((pl) => pl.id === id)
                  setUsername(p ? suggestUsername(p.nickname) : '')
                }
              }}
              autoFocus
              data-testid="mm-player"
            >
              <option value="">— Pick a player —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Username (login)"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setUsernameEdited(true)
            }}
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
            Gives an existing player a login so they can build draws and manage
            players. (A matchmaker is also a player.)
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} data-testid="mm-create-submit">
              {pending ? 'Saving…' : 'Make matchmaker'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function SkillSelect({
  value,
  onChange,
  testId,
}: {
  value: string
  onChange: (v: string) => void
  testId: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-fg-muted">Skill (1–10)</span>
      <select
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        <option value="">Not set</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}

function GenderSelect({
  value,
  onChange,
  testId,
}: {
  value: string
  onChange: (v: string) => void
  testId: string
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-fg-muted">Gender (for mixed doubles)</span>
      <select
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        <option value="">Not set</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
    </label>
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
          Excluded
        </span>
      )}
    </span>
  )
}

function PlayerModal({
  player,
  onClose,
  onSave,
  pending = false,
  saveError = '',
}: {
  player: Player | null
  onClose: () => void
  onSave: (input: PlayerInput) => void
  pending?: boolean
  saveError?: string
}) {
  const isEdit = player !== null
  const [nickname, setNickname] = useState(player?.nickname ?? '')
  const [skill, setSkill] = useState(player?.skill != null ? String(player.skill) : '')
  const [gender, setGender] = useState<string>(player?.gender ?? '')
  const [absent, setAbsent] = useState(player?.absent ?? false)
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) {
      setError('Name is required.')
      return
    }
    onSave({
      nickname,
      skill: skill === '' ? null : Number(skill),
      gender: gender === '' ? null : (gender as Gender),
      absent,
    })
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
        <SkillSelect value={skill} onChange={setSkill} testId="player-skill" />
        <GenderSelect value={gender} onChange={setGender} testId="player-gender" />
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={absent}
            onChange={(e) => setAbsent(e.target.checked)}
            data-testid="player-absent"
          />
          Excluded from draws
        </label>
        {(error || saveError) && (
          <p className="text-sm font-medium text-red-500" data-testid="player-save-error">
            {error || saveError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" data-testid="player-save" loading={pending}>
            {pending ? 'Saving…' : isEdit ? 'Save' : 'Add player'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
