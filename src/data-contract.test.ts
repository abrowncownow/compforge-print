import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { builds } from './data/builds'
import type { Item } from './types'

const publicRoot = path.join(process.cwd(), 'public')
const items = JSON.parse(readFileSync(path.join(publicRoot, 'data', 'items.json'), 'utf8')) as Item[]
const status = JSON.parse(readFileSync(path.join(publicRoot, 'status.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(path.join(publicRoot, 'data', 'source-manifest.json'), 'utf8'))
const sourceLock = JSON.parse(readFileSync(path.join(process.cwd(), 'scripts', 'source-lock.json'), 'utf8'))

describe('pinned TFT data contract', () => {
  it('contains the complete symmetric core recipe set', () => {
    const components = items.filter((item) => item.components.length === 0)
    const recipes = items.filter((item) => item.components.length === 2)
    expect(components).toHaveLength(8)
    expect(recipes).toHaveLength(36)
    expect(new Set(recipes.map((item) => [...item.components].sort().join('|'))).size).toBe(36)
    expect(recipes.some((item) => /Corrupted|Radiant|Shadow|Ornn|Artifact|Support/i.test(item.id))).toBe(false)
  })

  it('resolves every curated item and every local image', () => {
    const itemNames = new Set(items.map((item) => item.name))
    for (const item of items) expect(existsSync(path.join(publicRoot, item.icon.replace(/^\//, '')))).toBe(true)
    for (const build of builds) {
      expect(existsSync(path.join(publicRoot, build.portrait))).toBe(true)
      for (const itemName of [...build.primaryItems, ...build.alternatives]) expect(itemNames.has(itemName)).toBe(true)
    }
  })

  it('publishes provenance and fails visibly incomplete', () => {
    expect(status.counts.builds).toBe(builds.length)
    expect(status.counts.items).toBe(36)
    expect(status.dataFreshness).toBe('incomplete-preview')
    expect(manifest.sources[0].sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(manifest.sources[0].sha256).toBe(sourceLock.expectedSha256)
    expect(status.sourceVersion).toContain(sourceLock.expectedSha256.slice(0, 12))
  })
})
