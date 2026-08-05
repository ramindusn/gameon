import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, ChipPicker, Field, Modal, useConfirm } from '@gameon/ui'
import {
  isProductLowStock,
  stockByHolder,
  stockOverview,
  type Product,
  type StockHolder,
} from '@gameon/domain'
import { Icon } from '../app/Icon'
import { useFund } from './useFund'
import { loadInventoryLog, type InventoryLogEntry } from './api'

// Barrels are handed to the matchmakers who run game days and they keep them
// (TASK-69). Admins allocate stock to a matchmaker, move it between them, and
// see the club picture; matchmakers only ever read their own (see MyStock).

export function StockPanel() {
  const { state, myHolder, transfer, removeHolding, cloudBacked } = useFund()
  const confirm = useConfirm()

  const [transferring, setTransferring] = useState(false)

  const summary = stockOverview(state)
  // Only people actually holding something: a matchmaker with no barrels is
  // still selectable when allocating, but does not belong in this list.
  const holders = stockByHolder(state).filter((h) => h.items.length > 0)

  // Headline across every brand — the club's whole shuttle position at a glance.
  const grand = summary.reduce(
    (t, r) => ({
      barrels: t.barrels + r.barrels,
      loose: t.loose + r.looseShuttles,
      shuttles: t.shuttles + r.shuttles,
    }),
    { barrels: 0, loose: 0, shuttles: 0 },
  )

  async function confirmRemove(holderId: string, productId: string) {
    const holder = state.holders.find((h) => h.id === holderId)
    const product = state.products.find((p) => p.id === productId)
    const held = holdingOf(productId, holderId)
    if (!holder || !product || !held) return
    const ok = await confirm({
      title: 'Remove stock record',
      message: `Remove ${holder.name}'s ${product.brand} record (${held.barrels} barrels, ${held.looseShuttles} loose)? The change stays in the log.`,
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    await removeHolding({
      holder,
      product,
      prevBarrels: held.barrels,
      prevLooseShuttles: held.looseShuttles,
    })
    void log.refetch()
  }

  const log = useQuery({
    queryKey: ['inventory-log'],
    queryFn: () => loadInventoryLog(15),
    enabled: cloudBacked,
  })

  const holdingOf = (productId: string, holderId: string) =>
    state.holdings.find((h) => h.productId === productId && h.holderId === holderId)

  // Only products somebody is actually holding can be handed over. A product
  // nobody holds is either used up or no longer stocked, so offering it would
  // just be a dead end.
  const transferable = state.products.filter((p) =>
    state.holdings.some(
      (h) => h.productId === p.id && (h.barrels > 0 || h.looseShuttles > 0),
    ),
  )

  return (
    <Card
      title="Shuttle stock"
      icon={<Icon name="inventory" />}
      action={
        <Button
          variant="secondary"
          data-testid="transfer-stock"
          disabled={state.holders.length < 2 || transferable.length === 0}
          onClick={() => setTransferring(true)}
        >
          Transfer
        </Button>
      }
    >
      {/* Club summary: the headline position, then per brand. */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Club total
        </h3>
        <div
          className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-line bg-surface px-3 py-3"
          data-testid="grand-total"
        >
          <span className="text-2xl font-bold text-fg" data-testid="grand-shuttles">
            {grand.shuttles}
          </span>
          <span className="text-sm text-fg-muted">shuttles in the club</span>
          <span className="text-sm text-fg-muted">
            <b className="text-fg" data-testid="grand-barrels">
              {grand.barrels}
            </b>{' '}
            barrels ·{' '}
            <b className="text-fg" data-testid="grand-loose">
              {grand.loose}
            </b>{' '}
            loose
          </span>
        </div>
        <ul className="mt-2 space-y-2" data-testid="stock-summary">
          {summary.map(({ product, barrels, looseShuttles, shuttles }) => (
            <li
              key={product.id}
              data-testid={`summary-${product.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border border-line bg-surface-muted px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-semibold text-fg">{product.brand}</span>{' '}
                <span className="text-sm text-fg-muted">{product.model}</span>
                {isProductLowStock(state, product) && (
                  <span className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                    Low stock
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 text-sm">
                <span data-testid={`summary-barrels-${product.id}`}>
                  <b className="text-fg">{barrels}</b>{' '}
                  <span className="text-fg-muted">barrels</span>
                </span>
                <span data-testid={`summary-loose-${product.id}`}>
                  <b className="text-fg">{looseShuttles}</b>{' '}
                  <span className="text-fg-muted">loose</span>
                </span>
                <span className="text-fg-muted">
                  = <b className="text-fg">{shuttles}</b> shuttles
                </span>
              </div>
            </li>
          ))}
          {summary.length === 0 && (
            <li className="py-2 text-sm text-fg-muted">No products yet.</li>
          )}
        </ul>
      </section>

      {/* Who is keeping what. */}
      <section className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Held by
        </h3>
        <ul className="mt-2 space-y-2" data-testid="holder-breakdown">
          {holders.map(({ holder, items, totalShuttles }) => (
            <li
              key={holder.id}
              data-testid={`holder-${holder.id}`}
              className="rounded-lg border border-line bg-surface px-3 py-2"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold text-fg">{holder.name}</span>
                  {myHolder?.id === holder.id && (
                    <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-strong">
                      You
                    </span>
                  )}
                </div>
                <span className="text-sm text-fg-muted">{totalShuttles} shuttles</span>
              </div>
              <ul className="mt-1 space-y-1 text-sm text-fg-muted">
                {items.map((i) => (
                  <li key={i.product.id} className="flex items-center gap-2">
                    <span>
                      {i.product.brand}: <span className="text-fg">{i.barrels}</span>{' '}
                      barrels · <span className="text-fg">{i.looseShuttles}</span> loose
                    </span>
                    <Button
                      variant="ghost"
                      className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-500/10"
                      data-testid={`remove-${holder.id}-${i.product.id}`}
                      onClick={() => void confirmRemove(holder.id, i.product.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {holders.length === 0 && (
            <li className="py-2 text-sm text-fg-muted">
              Nobody is holding stock yet — add stock in Inventory.
            </li>
          )}
        </ul>
      </section>

      {/* Audit trail. */}
      <section className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          Recent changes
        </h3>
        <ul className="mt-2 divide-y divide-line" data-testid="inventory-log">
          {(log.data ?? []).map((e) => (
            <li key={e.id} className="py-1.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-fg">
                  <b>{e.actorName ?? 'An admin'}</b>{' '}
                  {describeChange(
                    e,
                    state.products.find((p) => p.id === e.productId)?.shuttlesPerBarrel,
                  )}{' '}
                  <span className="text-fg-muted">
                    ({e.productLabel} · {e.holderName})
                  </span>
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">
                  {new Date(e.occurredAt).toLocaleString()}
                </span>
              </div>
              {e.note && <p className="text-xs text-fg-subtle">{e.note}</p>}
            </li>
          ))}
          {(log.data ?? []).length === 0 && (
            <li className="py-2 text-sm text-fg-muted">No changes logged yet.</li>
          )}
        </ul>
      </section>

      {transferring && (
        <TransferModal
          products={transferable}
          holders={state.holders}
          holdingOf={holdingOf}
          onClose={() => setTransferring(false)}
          onSave={async (input) => {
            await transfer(input)
            void log.refetch()
            setTransferring(false)
          }}
        />
      )}
    </Card>
  )
}

/**
 * The change in words, from the reader's point of view.
 *
 * This used to narrate the bookkeeping: taking 3 shuttles out of a full barrel
 * reads in the table as barrels -1, loose +9, and it said exactly that —
 * "removed 1 barrel and added 9 loose shuttles" — which is true and tells you
 * nothing. People think in shuttles, and in what the action was, so that is what
 * it says now. Whole-barrel moves still name barrels, since that is how they are
 * handed over.
 */
function describeChange(e: InventoryLogEntry, shuttlesPerBarrel?: number): string {
  const per = shuttlesPerBarrel && shuttlesPerBarrel > 0 ? shuttlesPerBarrel : 0
  const net = per ? e.barrelsDelta * per + e.looseDelta : 0
  const plural = (n: number, unit: string) =>
    `${Math.abs(n)} ${unit}${Math.abs(n) === 1 ? '' : 's'}`

  // A clean barrel movement is best described as barrels.
  const wholeBarrels = e.looseDelta === 0 && e.barrelsDelta !== 0

  switch (e.action) {
    case 'usage':
      return per ? `used ${plural(net, 'shuttle')}` : 'recorded usage'
    case 'transfer':
      if (wholeBarrels) {
        return e.barrelsDelta > 0
          ? `received ${plural(e.barrelsDelta, 'barrel')}`
          : `handed over ${plural(e.barrelsDelta, 'barrel')}`
      }
      return e.barrelsDelta + e.looseDelta > 0 || net > 0
        ? `received ${plural(net, 'shuttle')}`
        : `handed over ${plural(net, 'shuttle')}`
    case 'allocate':
      return wholeBarrels
        ? `was given ${plural(e.barrelsDelta, 'barrel')}`
        : `was given ${plural(net, 'shuttle')}`
    case 'migrate':
      return 'opening balance'
    default:
      // adjust: a correction, or shuttles handed back when usage was deleted.
      if (net === 0 && e.barrelsDelta === 0 && e.looseDelta === 0) {
        return 'confirmed the count'
      }
      if (!per) return e.barrelsDelta + e.looseDelta > 0 ? 'stock added' : 'stock removed'
      return net > 0 ? `got back ${plural(net, 'shuttle')}` : `lost ${plural(net, 'shuttle')}`
  }
}

type HoldingLookup = (
  productId: string,
  holderId: string,
) => { barrels: number; looseShuttles: number } | undefined

/** Shared product + matchmaker pickers. The matchmaker is never optional. */
function Pickers({
  products,
  holders,
  productId,
  setProductId,
  holderId,
  setHolderId,
  holderLabel,
  holderTestId,
  holderPlaceholder = 'Select a matchmaker…',
  productPlaceholder = 'Select a product…',
}: {
  products: Product[]
  holders: StockHolder[]
  productId: string
  setProductId: (v: string) => void
  holderId: string
  setHolderId: (v: string) => void
  holderLabel: string
  holderTestId: string
  holderPlaceholder?: string
  productPlaceholder?: string
}) {
  return (
    <>
      <ChipPicker
        label="Product"
        data-testid="stock-product"
        value={productId}
        onChange={setProductId}
        empty={productPlaceholder}
        options={products.map((p) => ({ id: p.id, label: `${p.brand} ${p.model}` }))}
      />
      <ChipPicker
        label={holderLabel}
        data-testid={holderTestId}
        value={holderId}
        onChange={setHolderId}
        empty={holderPlaceholder}
        options={holders.map((h) => ({ id: h.id, label: h.name }))}
      />
    </>
  )
}

function TransferModal({
  products,
  holders,
  holdingOf,
  onClose,
  onSave,
}: {
  products: Product[]
  holders: StockHolder[]
  holdingOf: HoldingLookup
  onClose: () => void
  onSave: (input: {
    product: Product
    from: StockHolder
    to: StockHolder
    barrels: number
    looseShuttles: number
    fromBarrels: number
    fromLooseShuttles: number
    toBarrels: number
    toLooseShuttles: number
    note?: string
  }) => Promise<void>
}) {
  const [productId, setProductId] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [barrels, setBarrels] = useState('')
  const [loose, setLoose] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const product = products.find((p) => p.id === productId)

  // Only someone actually holding this product can hand it over, so "From"
  // lists just them — and it stays empty until a product is chosen, since who
  // can give depends on which product it is.
  const givers = productId
    ? holders.filter((h) => {
        const held = holdingOf(productId, h.id)
        return !!held && (held.barrels > 0 || held.looseShuttles > 0)
      })
    : []

  // Changing the product can invalidate the chosen giver — drop it if so.
  if (fromId && !givers.some((h) => h.id === fromId)) setFromId('')

  const from = givers.find((h) => h.id === fromId)
  const to = holders.find((h) => h.id === toId)
  const fromHeld = product && from ? holdingOf(product.id, from.id) : undefined
  const toHeld = product && to ? holdingOf(product.id, to.id) : undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return setError('Pick a product.')
    if (!from) return setError('Choose who is handing the stock over.')
    if (!to) return setError('Choose who is receiving it.')
    if (from.id === to.id) return setError('Pick two different matchmakers.')
    const b = Number(barrels || 0)
    const l = Number(loose || 0)
    if (!Number.isInteger(b) || b < 0 || !Number.isInteger(l) || l < 0) {
      return setError('Barrels and loose shuttles must be whole numbers, 0 or more.')
    }
    if (b === 0 && l === 0) return setError('Enter how much to transfer.')
    // Nobody can hand over more than they are holding.
    if (b > (fromHeld?.barrels ?? 0) || l > (fromHeld?.looseShuttles ?? 0)) {
      return setError(
        `${from.name} only holds ${fromHeld?.barrels ?? 0} barrels and ${fromHeld?.looseShuttles ?? 0} loose.`,
      )
    }

    setSaving(true)
    try {
      await onSave({
        product,
        from,
        to,
        barrels: b,
        looseShuttles: l,
        fromBarrels: fromHeld?.barrels ?? 0,
        fromLooseShuttles: fromHeld?.looseShuttles ?? 0,
        toBarrels: toHeld?.barrels ?? 0,
        toLooseShuttles: toHeld?.looseShuttles ?? 0,
      })
    } catch {
      setError('Could not transfer. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Modal open title="Transfer stock" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Pickers
          products={products}
          holders={givers}
          productId={productId}
          setProductId={setProductId}
          holderId={fromId}
          setHolderId={setFromId}
          holderLabel="From"
          holderTestId="transfer-from"
          productPlaceholder={
            products.length === 0 ? 'Nothing is being held' : 'Select a product…'
          }
          holderPlaceholder={
            !productId
              ? 'Pick a product first…'
              : givers.length === 0
                ? 'Nobody is holding this product'
                : 'Select a matchmaker…'
          }
        />
        <ChipPicker
          label="To"
          data-testid="transfer-to"
          value={toId}
          onChange={setToId}
          empty="Nobody else to hand it to"
          options={holders
            .filter((h) => h.id !== fromId)
            .map((h) => ({ id: h.id, label: h.name }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Barrels"
            type="number"
            min={0}
            data-testid="transfer-barrels"
            value={barrels}
            onChange={(e) => setBarrels(e.target.value)}
          />
          <Field
            label="Loose shuttles"
            type="number"
            min={0}
            data-testid="transfer-loose"
            value={loose}
            onChange={(e) => setLoose(e.target.value)}
          />
        </div>
        {from && product && (
          <p className="text-xs text-fg-subtle">
            {from.name} currently holds {fromHeld?.barrels ?? 0} barrels and{' '}
            {fromHeld?.looseShuttles ?? 0} loose of this product.
          </p>
        )}
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" data-testid="save-transfer" disabled={saving}>
            {saving ? 'Transferring…' : 'Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
