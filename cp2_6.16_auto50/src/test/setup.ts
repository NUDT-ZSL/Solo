import '@testing-library/jest-dom'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

const { ResizeObserver } = window

beforeEach(() => {
  // @ts-ignore
  delete window.ResizeObserver
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

afterEach(() => {
  window.ResizeObserver = ResizeObserver
  vi.restoreAllMocks()
})
