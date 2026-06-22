import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest runs without `globals: true`, so RTL's automatic cleanup isn't
// registered — unmount between tests ourselves to keep renders isolated.
afterEach(() => cleanup())
