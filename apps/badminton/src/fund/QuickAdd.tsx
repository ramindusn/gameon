// Compact admin "quick add" panel — one small form per fund input so the
// dashboard KPIs/tables can be populated and recomputed live. Edit/delete and
// the richer Stitch layout are follow-up polish within TASK-7.3.

import { useState, type FormEvent, type ReactNode } from 'react'
import { Card, Button } from '@gameon/ui'
import type { FundState } from '@gameon/domain'
import { useFundMutations } from './useFund'

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2">{children}</div>
}

function num(v: FormDataEntryValue | null): number {
  return Number(v ?? 0)
}

export function QuickAdd({ clubId, state }: { clubId: string; state: FundState }) {
  const m = useFundMutations(clubId)
  const [tab, setTab] = useState<'money' | 'stock'>('money')

  const reset = (e: FormEvent<HTMLFormElement>) => e.currentTarget.reset()

  return (
    <Card title="Quick add" icon="➕">
      <div className="mb-4 flex gap-2">
        <Button
          variant={tab === 'money' ? 'primary' : 'secondary'}
          onClick={() => setTab('money')}
        >
          Money
        </Button>
        <Button
          variant={tab === 'stock' ? 'primary' : 'secondary'}
          onClick={() => setTab('stock')}
        >
          Shuttles
        </Button>
      </div>

      {tab === 'money' ? (
        <div className="space-y-4">
          <form
            data-testid="add-member-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const name = String(f.get('name') ?? '').trim()
              if (name) m.addMember.mutate(name)
              reset(e)
            }}
          >
            <Row>
              <input
                name="name"
                placeholder="New member name"
                className={inputCls}
                required
              />
              <Button type="submit" data-testid="add-member-submit">
                Add member
              </Button>
            </Row>
          </form>

          <form
            data-testid="add-contribution-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const memberId = String(f.get('memberId') ?? '')
              const amount = num(f.get('amount'))
              if (memberId && amount > 0) m.addContribution.mutate({ memberId, amount })
              reset(e)
            }}
          >
            <Row>
              <select name="memberId" className={inputCls} required defaultValue="">
                <option value="" disabled>
                  Member…
                </option>
                {state.members.map((mem) => (
                  <option key={mem.id} value={mem.id}>
                    {mem.name}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount €"
                className={inputCls}
                required
              />
              <Button type="submit" data-testid="add-contribution-submit">
                Add contribution
              </Button>
            </Row>
          </form>

          <form
            data-testid="add-expense-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const description = String(f.get('description') ?? '').trim()
              const amount = num(f.get('amount'))
              if (description && amount > 0) m.addExpense.mutate({ description, amount })
              reset(e)
            }}
          >
            <Row>
              <input
                name="description"
                placeholder="Expense"
                className={inputCls}
                required
              />
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount €"
                className={inputCls}
                required
              />
              <Button type="submit" data-testid="add-expense-submit">
                Add expense
              </Button>
            </Row>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <form
            data-testid="add-product-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const brand = String(f.get('brand') ?? '').trim()
              const model = String(f.get('model') ?? '').trim()
              const shuttlesPerBarrel = num(f.get('perBarrel')) || 12
              if (brand && model) m.addProduct.mutate({ brand, model, shuttlesPerBarrel })
              reset(e)
            }}
          >
            <Row>
              <input name="brand" placeholder="Brand" className={inputCls} required />
              <input name="model" placeholder="Model" className={inputCls} required />
              <input
                name="perBarrel"
                type="number"
                min="1"
                placeholder="Per barrel"
                className={inputCls}
              />
              <Button type="submit" data-testid="add-product-submit">
                Add product
              </Button>
            </Row>
          </form>

          <form
            data-testid="add-purchase-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const productId = String(f.get('productId') ?? '')
              const barrels = num(f.get('barrels'))
              const pricePerBarrel = num(f.get('price'))
              const product = state.products.find((p) => p.id === productId)
              if (product && barrels > 0)
                m.addPurchase.mutate({
                  productId,
                  barrels,
                  pricePerBarrel,
                  currentBarrels: product.barrels,
                })
              reset(e)
            }}
          >
            <Row>
              <select name="productId" className={inputCls} required defaultValue="">
                <option value="" disabled>
                  Product…
                </option>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.model}
                  </option>
                ))}
              </select>
              <input
                name="barrels"
                type="number"
                min="1"
                placeholder="Barrels"
                className={inputCls}
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="€/barrel"
                className={inputCls}
                required
              />
              <Button type="submit" data-testid="add-purchase-submit">
                Buy barrels
              </Button>
            </Row>
          </form>

          <form
            data-testid="log-usage-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const productId = String(f.get('productId') ?? '')
              const shuttlesUsed = num(f.get('shuttles'))
              if (productId && shuttlesUsed > 0)
                m.logUsage.mutate({ productId, shuttlesUsed })
              reset(e)
            }}
          >
            <Row>
              <select name="productId" className={inputCls} required defaultValue="">
                <option value="" disabled>
                  Product…
                </option>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.model}
                  </option>
                ))}
              </select>
              <input
                name="shuttles"
                type="number"
                min="1"
                placeholder="Shuttles used"
                className={inputCls}
                required
              />
              <Button type="submit" data-testid="log-usage-submit">
                Log usage
              </Button>
            </Row>
          </form>
        </div>
      )}
    </Card>
  )
}
