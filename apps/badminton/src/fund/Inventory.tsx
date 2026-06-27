import { useState } from 'react'
import { Button, Card, Field, Modal, useConfirm } from '@gameon/ui'
import { Icon } from '../app/Icon'
import {
  euro,
  formatDateTime,
  isLowStock,
  nowLocalInput,
  productShuttleCount,
  type Product,
  type Purchase,
} from '@gameon/domain'
import { useAuth } from '../auth/useAuth'
import { useFund } from './useFund'

interface RowData {
  product: Product
  batch: Purchase | null
}

export function Inventory() {
  const { state, addProduct, updateProduct, deleteProduct } = useFund()
  const { role } = useAuth()
  const confirm = useConfirm()

  const confirmDelete = async (p: Product) => {
    const ok = await confirm({
      title: 'Delete product',
      message: `Delete ${p.brand} ${p.model}? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteProduct(p.id)
  }
  const isAuthenticated = role === 'admin'

  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const rows: RowData[] = state.products.flatMap((product): RowData[] => {
    const batches = state.purchases
      .filter((p) => p.productId === product.id)
      .sort((a, b) => a.date.localeCompare(b.date))
    if (batches.length === 0) return [{ product, batch: null }]
    return batches.map((batch) => ({ product, batch }))
  })

  return (
    <Card
      title="Inventory Left"
      icon={<Icon name="inventory" />}
      action={
        isAuthenticated ? (
          <Button data-testid="add-product-button" onClick={() => setEditing('new')}>
            + Add product
          </Button>
        ) : undefined
      }
    >
      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {rows.map(({ product: p, batch }, i) => {
          const low = isLowStock(p)
          const firstOfProduct = rows.findIndex((r) => r.product.id === p.id) === i
          const perShuttle =
            batch && p.shuttlesPerBarrel > 0
              ? batch.pricePerBarrel / p.shuttlesPerBarrel
              : 0
          return (
            <li
              key={(batch ? batch.id : p.id) + '-m-' + i}
              className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
                <div className="min-w-0 break-words">
                  <span className="font-semibold text-fg">{p.brand}</span>{' '}
                  <span className="text-fg-muted">{p.model}</span>
                </div>
                {firstOfProduct && low && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-400">
                    Low stock
                  </span>
                )}
              </div>
              <dl className="divide-y divide-line px-3 text-sm">
                <DetailRow label="Barrels" value={batch ? String(batch.barrels) : '—'} />
                <DetailRow
                  label="€ / barrel"
                  value={batch ? euro(batch.pricePerBarrel) : '—'}
                />
                <DetailRow label="€ / shuttle" value={batch ? euro(perShuttle) : '—'} />
                <DetailRow
                  label="Added"
                  value={batch ? formatDateTime(batch.date) : '—'}
                  muted
                />
                {firstOfProduct && (
                  <>
                    <DetailRow label="Loose shuttles" value={String(p.looseShuttles)} />
                    <DetailRow
                      label="Total shuttles"
                      value={String(productShuttleCount(p))}
                      emphasis
                    />
                  </>
                )}
              </dl>
              {isAuthenticated && (
                <div className="flex gap-2 border-t border-line bg-surface-muted px-3 py-2">
                  <Button
                    variant="secondary"
                    className="flex-1 py-1.5"
                    onClick={() => setEditing(p)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 py-1.5 text-red-500 hover:bg-red-500/10"
                    onClick={() => void confirmDelete(p)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </li>
          )
        })}
        {rows.length === 0 && (
          <li className="py-3 text-sm text-fg-muted">No products yet.</li>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fg-muted">
              <th className="py-2 pr-3 font-medium">Product</th>
              <th className="py-2 pr-3 font-medium">Batch barrels</th>
              <th className="py-2 pr-3 font-medium">€/barrel</th>
              <th className="py-2 pr-3 font-medium">€/shuttle</th>
              <th className="py-2 pr-3 font-medium">Added</th>
              <th className="py-2 pr-3 font-medium">Loose</th>
              <th className="py-2 pr-3 font-medium">Total shuttles</th>
              {isAuthenticated && <th className="py-2 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product: p, batch }, i) => {
              const low = isLowStock(p)
              const firstOfProduct = rows.findIndex((r) => r.product.id === p.id) === i
              const perShuttle =
                batch && p.shuttlesPerBarrel > 0
                  ? batch.pricePerBarrel / p.shuttlesPerBarrel
                  : 0
              return (
                <tr
                  key={batch ? batch.id : p.id + '-' + i}
                  className="border-b border-line hover:bg-surface-muted"
                >
                  <td className="py-2 pr-3">
                    <span className="font-semibold text-fg">{p.brand}</span>{' '}
                    <span className="text-fg-muted">{p.model}</span>
                  </td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {batch ? batch.barrels : '—'}
                  </td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {batch ? euro(batch.pricePerBarrel) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {batch ? euro(perShuttle) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {batch ? formatDateTime(batch.date) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-fg-muted">
                    {firstOfProduct ? p.looseShuttles : ''}
                  </td>
                  <td className="py-2 pr-3">
                    {firstOfProduct && (
                      <>
                        <span className="font-semibold text-fg">
                          {productShuttleCount(p)}
                        </span>
                        {low && (
                          <span className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                            Low stock
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  {isAuthenticated && (
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
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
                          onClick={() => void confirmDelete(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-3 text-fg-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        Each row is one purchase batch with its own fixed price and date. To add more
        stock, use “Add product”. Loose shuttles and the barrel count can be corrected
        with “Edit”. Batch prices are edited in the Transaction Log.
      </p>

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onAdd={(data) => {
            addProduct(data)
            setEditing(null)
          }}
          onUpdate={(id, data) => {
            updateProduct(id, data)
            setEditing(null)
          }}
        />
      )}
    </Card>
  )
}

function DetailRow({
  label,
  value,
  muted = false,
  emphasis = false,
}: {
  label: string
  value: string
  muted?: boolean
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd
        className={`text-right ${
          emphasis
            ? 'text-base font-bold text-fg'
            : muted
              ? 'text-fg-muted'
              : 'font-medium text-fg'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function ProductModal({
  product,
  onClose,
  onAdd,
  onUpdate,
}: {
  product: Product | null
  onClose: () => void
  onAdd: (data: {
    brand: string
    model: string
    shuttlesPerBarrel: number
    pricePerBarrel: number
    barrels: number
    when: string
  }) => void
  onUpdate: (
    id: string,
    data: {
      brand: string
      model: string
      shuttlesPerBarrel: number
      barrels: number
      looseShuttles: number
    },
  ) => void
}) {
  const isEdit = product !== null
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [model, setModel] = useState(product?.model ?? '')
  const [perBarrel, setPerBarrel] = useState(String(product?.shuttlesPerBarrel ?? 12))
  const [price, setPrice] = useState('')
  const [barrels, setBarrels] = useState(String(product?.barrels ?? ''))
  const [loose, setLoose] = useState(String(product?.looseShuttles ?? 0))
  const [when, setWhen] = useState(nowLocalInput())
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!brand.trim() || !model.trim()) {
      setError('Brand and model are required.')
      return
    }
    if (isEdit) {
      onUpdate(product.id, {
        brand,
        model,
        shuttlesPerBarrel: Number(perBarrel) || 1,
        barrels: Number(barrels) || 0,
        looseShuttles: Number(loose) || 0,
      })
    } else {
      if (Number(barrels) <= 0) {
        setError('Enter how many barrels you bought (at least 1).')
        return
      }
      if (Number(price) <= 0) {
        setError('Enter the price per barrel.')
        return
      }
      onAdd({
        brand,
        model,
        shuttlesPerBarrel: Number(perBarrel) || 1,
        pricePerBarrel: Number(price) || 0,
        barrels: Number(barrels) || 0,
        when,
      })
    }
  }

  return (
    <Modal open title={isEdit ? 'Edit product' : 'Add new product'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field
          label="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          autoFocus
          placeholder="e.g. Yonex"
        />
        <Field
          label="Model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g. AS-30"
        />
        {isEdit ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Shuttles / barrel"
                type="number"
                min={1}
                value={perBarrel}
                onChange={(e) => setPerBarrel(e.target.value)}
              />
              <Field
                label="Barrels in stock"
                type="number"
                min={0}
                value={barrels}
                onChange={(e) => setBarrels(e.target.value)}
              />
            </div>
            <Field
              label="Loose shuttles"
              type="number"
              min={0}
              value={loose}
              onChange={(e) => setLoose(e.target.value)}
            />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Barrels to buy"
              type="number"
              min={1}
              value={barrels}
              onChange={(e) => setBarrels(e.target.value)}
            />
            <Field
              label="Price per barrel (€)"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}
        <p className="text-xs text-fg-subtle">
          {isEdit
            ? '“Loose” = leftover shuttles that don’t fill a full barrel. Editing the barrel and loose counts is a manual stock correction and does not change the fund. To change a batch price, edit it in the Transaction Log.'
            : 'A new product is added as a purchase batch. The fund drops by barrels × price, and that price stays fixed for this batch. (Defaults to 12 shuttles per barrel — adjust later with Edit.)'}
        </p>
        {!isEdit && (
          <Field
            label="Date & time"
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        )}
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isEdit ? 'Save changes' : 'Add product'}</Button>
        </div>
      </form>
    </Modal>
  )
}
