import { describe, expect, it } from 'vitest'
import { migrate, type Migration } from './migrate'

describe('migrate', () => {
  const steps: Migration[] = [
    ({ name, ...rest }) => ({ ...rest, title: name }), // v1 -> v2: rename field
    (doc) => ({ ...doc, tags: [] }), // v2 -> v3: add field
  ]

  it('applies all steps from an old version in order', () => {
    expect(migrate({ v: 1, name: 'x' }, 'v', steps)).toEqual({ v: 3, title: 'x', tags: [] })
  })

  it('applies only the missing steps', () => {
    expect(migrate({ v: 2, title: 'x' }, 'v', steps)).toEqual({ v: 3, title: 'x', tags: [] })
  })

  it('returns current documents unchanged', () => {
    expect(migrate({ v: 3, title: 'x', tags: [] }, 'v', steps)).toEqual({ v: 3, title: 'x', tags: [] })
  })

  it('rejects versions from a newer app', () => {
    expect(() => migrate({ v: 4 }, 'v', steps)).toThrow(/update the app/)
  })

  it('rejects missing or invalid versions and non-objects', () => {
    expect(() => migrate({}, 'v', steps)).toThrow(/whole number/)
    expect(() => migrate({ v: '1' }, 'v', steps)).toThrow(/whole number/)
    expect(() => migrate([], 'v', steps)).toThrow(/JSON object/)
  })
})
