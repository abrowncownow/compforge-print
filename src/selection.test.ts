import { describe, expect, it } from 'vitest'
import { readSelection, writeSelection } from './selection'

const valid = new Set(['alpha', 'beta', 'gamma'])

describe('packet selection URLs', () => {
  it('prefers valid query selections and removes duplicates', () => {
    expect(readSelection('?builds=beta,nope,beta,alpha', '["gamma"]', valid, ['alpha'])).toEqual(['beta', 'alpha'])
  })

  it('falls back through storage without trusting corrupt values', () => {
    expect(readSelection('', '["gamma","nope"]', valid, ['alpha'])).toEqual(['gamma'])
    expect(readSelection('', '{bad', valid, ['alpha'])).toEqual(['alpha'])
  })

  it('preserves unrelated query parameters', () => {
    expect(writeSelection('?mode=preview', ['alpha', 'gamma'])).toBe('?mode=preview&builds=alpha%2Cgamma')
    expect(writeSelection('?builds=alpha&mode=preview', [])).toBe('?mode=preview')
  })
})
