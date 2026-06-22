import { useState } from 'react'
import { Button, Field, Modal } from '@gameon/ui'
import { nowLocalInput } from '@gameon/domain'
import { useFund } from './useFund'

type Kind = 'cash' | 'expense' | 'usage'

/**
 * Single "+ Add transaction" entry point. Opens a chooser, then routes to a
 * dedicated, self-contained modal for the selected kind.
 */
export function QuickAdd() {
  const [chooserOpen, setChooserOpen] = useState(false)
  const [kind, setKind] = useState<Kind | null>(null)

  function pick(k: Kind) {
    setKind(k)
    setChooserOpen(false)
  }

  return (
    <>
      <Button data-testid="quick-add-button" onClick={() => setChooserOpen(true)}>
        + Add transaction
      </Button>

      {chooserOpen && (
        <Modal
          open
          title="What kind of transaction?"
          onClose={() => setChooserOpen(false)}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ChoiceCard
              accent="teal"
              title="Cash in"
              subtitle="Money received from a member"
              onClick={() => pick('cash')}
            />
            <ChoiceCard
              accent="amber"
              title="Expense"
              subtitle="Money paid out (not shuttles)"
              onClick={() => pick('expense')}
            />
            <ChoiceCard
              accent="emerald"
              title="Game-day usage"
              subtitle="Members pay for shuttles used"
              onClick={() => pick('usage')}
            />
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            Buying shuttles? Use <span className="font-medium">Add product</span> in the
            Inventory card so the batch price is tracked.
          </p>
        </Modal>
      )}

      {kind === 'cash' && <CashModal onClose={() => setKind(null)} />}
      {kind === 'expense' && <ExpenseModal onClose={() => setKind(null)} />}
      {kind === 'usage' && <UsageModal onClose={() => setKind(null)} />}
    </>
  )
}

function ChoiceCard({
  accent,
  title,
  subtitle,
  onClick,
}: {
  accent: 'teal' | 'amber' | 'emerald'
  title: string
  subtitle: string
  onClick: () => void
}) {
  const accents = {
    teal: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10',
    amber:
      'border-amber-200 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10',
    emerald:
      'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
  } as const
  const dots = {
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  } as const
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 bg-surface p-3 text-left transition ${accents[accent]}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dots[accent]}`} />
        <span className="font-semibold text-fg">{title}</span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">{subtitle}</p>
    </button>
  )
}

function CashModal({ onClose }: { onClose: () => void }) {
  const { state, addCash } = useFund()
  const [memberId, setMemberId] = useState(state.members[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState(nowLocalInput())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || Number(amount) <= 0) return
    addCash(memberId, Number(amount), when)
    onClose()
  }

  return (
    <Modal open title="Cash in from member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-fg-muted">Member</span>
          <select
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            {state.members.length === 0 && <option value="">No members yet</option>}
          </select>
        </label>
        <Field
          label="Amount (€)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          placeholder="0.00"
        />
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-xs text-fg-subtle">
          Increases the fund and the member's starting balance.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!memberId}>
            Add cash
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const { addExpense } = useFund()
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [when, setWhen] = useState(nowLocalInput())

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim() || Number(amount) <= 0) return
    addExpense(desc.trim(), Number(amount), when)
    onClose()
  }

  return (
    <Modal open title="Add an expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          autoFocus
          placeholder="e.g. court rental"
        />
        <Field
          label="Amount (€)"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <Field
          label="Date & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <p className="text-xs text-fg-subtle">Decreases the fund.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add expense</Button>
        </div>
      </form>
    </Modal>
  )
}

function UsageModal({ onClose }: { onClose: () => void }) {
  const { state, recordUsage } = useFund()
  const [when, setWhen] = useState(nowLocalInput())
  const [counts, setCounts] = useState<Record<string, string>>({})

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const items = state.products
      .map((p) => ({ productId: p.id, shuttlesUsed: Number(counts[p.id] || 0) }))
      .filter((i) => i.shuttlesUsed > 0)
    if (items.length === 0) return
    recordUsage(when, items)
    onClose()
  }

  return (
    <Modal open title="Record game-day usage" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Game day & time"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        {state.products.map((p) => (
          <Field
            key={p.id}
            label={`${p.brand} ${p.model} — shuttles used`}
            type="number"
            min={0}
            step="1"
            value={counts[p.id] ?? ''}
            onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
            placeholder="0"
          />
        ))}
        {state.products.length === 0 && (
          <p className="text-sm text-fg-muted">Add a product first in Inventory.</p>
        )}
        <p className="text-xs text-fg-subtle">
          Members are charged for the shuttles used. Increases the fund.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={state.products.length === 0}>
            Record usage
          </Button>
        </div>
      </form>
    </Modal>
  )
}
