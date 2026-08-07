import { useMemo, useState } from 'react'
import { Button, Card, Field, Modal, useConfirm } from '@gameon/ui'
import { Icon } from '../app/Icon'
import { euro, formatDateTime, usageHistory, type TxRef } from '@gameon/domain'
import { useAuth } from '../auth/useAuth'
import { useFund } from './useFund'

type Kind = 'contribution' | 'purchase' | 'expense' | 'usage'

interface LogRow {
  ref: TxRef
  kind: Kind
  label: string
  amount: number // positive = into fund, negative = out
  date: string
  loggedBy?: string
  batch?: { id: string; pricePerBarrel: number; barrels: number }
}

const PAGE_SIZE = 10

const KIND_BADGE: Record<Kind, { label: string; className: string }> = {
  contribution: { label: 'Cash', className: 'bg-teal-500/15 text-teal-300' },
  purchase: { label: 'Purchase', className: 'bg-purple-500/15 text-purple-300' },
  expense: { label: 'Expense', className: 'bg-amber-500/15 text-amber-300' },
  usage: { label: 'Usage', className: 'bg-emerald-500/15 text-emerald-300' },
}

export function TransactionLog() {
  const { state, deleteTransaction, updateBatchPrice } = useFund()
  const confirm = useConfirm()
  const { role } = useAuth()
  const isAuthenticated = role === 'admin'
  const [editingBatch, setEditingBatch] = useState<LogRow['batch'] | null>(null)
  const [page, setPage] = useState(0)

  const productName = (id: string) => {
    const p = state.products.find((x) => x.id === id)
    return p ? `${p.brand} ${p.model}` : 'product'
  }

  const rows: LogRow[] = useMemo(() => {
    const all: LogRow[] = [
      ...state.members.flatMap((m) =>
        m.contributions.map((c) => ({
          ref: { kind: 'contribution', memberId: m.id, id: c.id } as TxRef,
          kind: 'contribution' as const,
          label: `Cash from ${m.name}`,
          amount: c.amount,
          date: c.date,
          loggedBy: c.loggedBy,
        })),
      ),
      ...state.purchases.map((p) => ({
        ref: { kind: 'purchase', id: p.id } as TxRef,
        kind: 'purchase' as const,
        label: `Bought ${p.barrels} × ${productName(p.productId)} barrel${p.barrels === 1 ? '' : 's'} @ ${euro(p.pricePerBarrel)}`,
        amount: -(p.barrels * p.pricePerBarrel),
        date: p.date,
        loggedBy: p.loggedBy,
        batch: { id: p.id, pricePerBarrel: p.pricePerBarrel, barrels: p.barrels },
      })),
      ...state.expenses.map((e) => ({
        ref: { kind: 'expense', id: e.id } as TxRef,
        kind: 'expense' as const,
        label: e.description,
        amount: -e.amount,
        date: e.date,
        loggedBy: e.loggedBy,
      })),
      ...usageHistory(state).map((u) => ({
        ref: { kind: 'usage', id: u.id } as TxRef,
        kind: 'usage' as const,
        label: `Members paid for ${u.totalShuttles} shuttle${u.totalShuttles === 1 ? '' : 's'} used`,
        amount: u.totalCost,
        date: u.date,
        loggedBy: u.loggedBy,
      })),
    ]
    return all.sort((a, b) => b.date.localeCompare(a.date))
  }, [state])

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const visible = rows.slice(start, start + PAGE_SIZE)

  async function handleDelete(row: LogRow) {
    const sign = row.amount >= 0 ? '+' : '−'
    // A purchase names no holder, so deleting it cannot know whose stock to
    // reduce — it used to claim otherwise while quietly changing nothing on
    // screen. Say what it does, and point at the Adjust that does the rest.
    const detail =
      row.kind === 'purchase'
        ? 'This removes the cost from the fund. The barrels stay with whoever is holding them — use Adjust in Shuttle stock if they are going back.'
        : row.kind === 'usage'
          ? 'This returns those shuttles to whoever they came from and undoes the payment.'
          : 'This updates the fund accordingly.'
    const ok = await confirm({
      title: 'Delete entry',
      message: `Delete "${row.label}" (${sign} ${euro(Math.abs(row.amount))})? ${detail}`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteTransaction(row.ref)
  }

  return (
    <Card title="Transaction Log" icon={<Icon name="receipt" />}>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-fg-muted">No transactions yet.</p>
      ) : (
        <>
          <div data-testid="transaction-log">
            {/* Mobile: stacked cards */}
            <ul className="space-y-3 sm:hidden">
              {visible.map((r, i) => {
                const badge = KIND_BADGE[r.kind]
                return (
                  <li
                    key={`m-${r.kind}-${start + i}`}
                    className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span
                        className={`whitespace-nowrap text-base font-bold ${r.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                      >
                        {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
                      </span>
                    </div>
                    <div className="break-words px-3 py-2.5 text-sm leading-snug text-fg">
                      {r.label}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-muted px-3 py-1.5">
                      <span className="text-xs text-fg-muted">
                        {formatDateTime(r.date)}
                        {r.loggedBy ? ` · by ${r.loggedBy}` : ''}
                      </span>
                      {isAuthenticated && (
                        <div className="flex items-center gap-1">
                          {r.batch && (
                            <button
                              type="button"
                              aria-label="Edit batch price"
                              title="Edit batch price"
                              onClick={() => setEditingBatch(r.batch)}
                              className="rounded p-1 text-fg-subtle transition-colors hover:bg-accent/10 hover:text-accent-strong"
                            >
                              ✎
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Delete entry"
                            onClick={() => void handleDelete(r)}
                            className="rounded p-1 text-fg-subtle transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-subtle">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Description</th>
                    <th className="py-2 pr-3 font-medium">Logged by</th>
                    <th className="py-2 pr-3 text-right font-medium">Amount</th>
                    {isAuthenticated && <th className="py-2 font-medium" />}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => {
                    const badge = KIND_BADGE[r.kind]
                    return (
                      <tr
                        key={`${r.kind}-${start + i}`}
                        className="border-b border-line align-top hover:bg-surface-muted"
                      >
                        <td className="whitespace-nowrap py-2.5 pr-3 text-fg-muted">
                          {formatDateTime(r.date)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-fg">{r.label}</td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-fg-muted">
                          {r.loggedBy ?? '—'}
                        </td>
                        <td
                          className={`whitespace-nowrap py-2.5 pr-3 text-right font-bold ${r.amount >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                        >
                          {r.amount >= 0 ? '+' : '−'} {euro(Math.abs(r.amount))}
                        </td>
                        {isAuthenticated && (
                          <td className="py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              {r.batch && (
                                <button
                                  type="button"
                                  aria-label="Edit batch price"
                                  title="Edit batch price"
                                  onClick={() => setEditingBatch(r.batch)}
                                  className="rounded p-1 text-fg-subtle transition-colors hover:bg-accent/10 hover:text-accent-strong"
                                >
                                  ✎
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="Delete entry"
                                onClick={() => void handleDelete(r)}
                                className="rounded p-1 text-fg-subtle transition-colors hover:bg-red-500/10 hover:text-red-500"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col gap-3 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
            <span data-testid="log-range">
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of{' '}
              {rows.length}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="px-2.5 py-1"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Newer
                </Button>
                <span className="tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  className="px-2.5 py-1"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Older →
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {editingBatch && (
        <EditBatchPriceModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSave={(price) => {
            updateBatchPrice(editingBatch.id, price)
            setEditingBatch(null)
          }}
        />
      )}
    </Card>
  )
}

function EditBatchPriceModal({
  batch,
  onClose,
  onSave,
}: {
  batch: { id: string; pricePerBarrel: number; barrels: number }
  onClose: () => void
  onSave: (pricePerBarrel: number) => void
}) {
  const [price, setPrice] = useState(String(batch.pricePerBarrel))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (Number(price) < 0) return
    onSave(Number(price))
  }

  return (
    <Modal open title="Edit batch price" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Price per barrel (€)"
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-fg-subtle">
          This changes the fixed price for this whole batch of {batch.barrels} barrel
          {batch.barrels === 1 ? '' : 's'}. The fund and average prices update
          accordingly. Other batches are unaffected.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save price</Button>
        </div>
      </form>
    </Modal>
  )
}
