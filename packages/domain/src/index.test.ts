import { describe, it, expect } from 'vitest'
import { APP_NAME, greet } from './index'

describe('greet', () => {
  it('greets with the app name', () => {
    expect(greet('Coach')).toBe(`Welcome to ${APP_NAME}, Coach`)
  })
})
