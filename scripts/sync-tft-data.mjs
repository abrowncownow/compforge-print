import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceUrl = 'https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json'
const assetBase = 'https://raw.communitydragon.org/pbe/game/'
const ddragonVersion = '16.16.1'
const setId = 'TFTSet18'
const channel = 'pbe'
const sourceLock = JSON.parse(await readFile(path.join(root, 'scripts', 'source-lock.json'), 'utf8'))

const componentIds = [
  'TFT_Item_BFSword',
  'TFT_Item_RecurveBow',
  'TFT_Item_NeedlesslyLargeRod',
  'TFT_Item_TearOfTheGoddess',
  'TFT_Item_ChainVest',
  'TFT_Item_NegatronCloak',
  'TFT_Item_GiantsBelt',
  'TFT_Item_SparringGloves',
]

const editorialChampionIds = ['Ahri', 'Gnar', 'Morgana', 'Kennen', 'Xayah', 'Lux', 'Sett', 'Lillia']

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const gameAssetUrl = (value) => `${assetBase}${value.toLowerCase().replace(/\.tex$/i, '.png')}`
const sha256 = (value) => createHash('sha256').update(value).digest('hex')

async function fetchOk(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response
}

async function download(url, destination) {
  const response = await fetchOk(url)
  const bytes = Buffer.from(await response.arrayBuffer())
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, bytes)
  return { bytes: bytes.length, sha256: sha256(bytes) }
}

const rawResponse = await fetchOk(sourceUrl)
const rawText = await rawResponse.text()
const sourceSha256 = sha256(rawText)
if (sourceLock.sourceUrl !== sourceUrl || sourceLock.expectedSha256 !== sourceSha256) {
  throw new Error(
    `PBE source lock mismatch. Expected ${sourceLock.expectedSha256}; received ${sourceSha256}. Review the upstream diff and update scripts/source-lock.json deliberately.`,
  )
}
const sourceVersion = `${sourceLock.version}-${sourceSha256.slice(0, 12)}`
const source = JSON.parse(rawText)
const set = source.sets?.['18']
if (!set) throw new Error('Set 18 is missing from the PBE snapshot.')

const itemById = new Map(source.items.map((item) => [item.apiName, item]))
const components = componentIds.map((id) => itemById.get(id)).filter(Boolean)
if (components.length !== componentIds.length) {
  throw new Error(`Expected ${componentIds.length} base components; found ${components.length}.`)
}

const recipeMap = new Map()
const canonicalScore = (item) => {
  const id = String(item.apiName || '')
  if (/Corrupted|Radiant|Shadow|Ornn|Artifact|Support/i.test(id)) return -100
  if (/^TFT_Item_[A-Za-z]/.test(id)) return 10
  return 0
}
for (const item of source.items) {
  if (!item.name || !item.icon || !Array.isArray(item.composition) || item.composition.length !== 2) continue
  if (!item.composition.every((id) => componentIds.includes(id))) continue
  const key = [...item.composition].sort().join('|')
  const current = recipeMap.get(key)
  if (!current || canonicalScore(item) > canonicalScore(current)) recipeMap.set(key, item)
}
const completedItems = [...recipeMap.values()].sort((a, b) => a.name.localeCompare(b.name))
if (completedItems.length < 36) {
  throw new Error(`Expected at least 36 core recipes; found ${completedItems.length}.`)
}
if (completedItems.some((item) => /Corrupted|Radiant|Shadow|Ornn|Artifact|Support/i.test(item.apiName))) {
  throw new Error('Core recipe selection included a non-canonical item variant.')
}

const playableChampions = set.champions
  .filter((champion) => champion.name && champion.cost >= 1 && champion.cost <= 5 && champion.traits?.length)
  .map((champion) => ({
    id: champion.apiName,
    name: champion.name,
    cost: champion.cost,
    role: champion.role || 'Unknown',
    traits: champion.traits,
    portrait: `/assets/tft/champions/${slug(champion.apiName)}.png`,
    sourceAsset: champion.squareIcon || champion.icon,
  }))
  .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name))

const normalizedItems = [...components, ...completedItems].map((item) => ({
  id: item.apiName,
  name: item.name,
  description: String(item.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  components: item.composition || [],
  icon: `/assets/tft/items/${slug(item.apiName)}.png`,
  sourceAsset: item.icon,
}))

const assetRecords = []
for (const champion of playableChampions) {
  assetRecords.push({
    kind: 'champion',
    id: champion.id,
    destination: champion.portrait,
    source: gameAssetUrl(champion.sourceAsset),
  })
}
for (const item of normalizedItems) {
  assetRecords.push({
    kind: 'item',
    id: item.id,
    destination: item.icon,
    source: gameAssetUrl(item.sourceAsset),
  })
}
for (const championId of editorialChampionIds) {
  assetRecords.push({
    kind: 'editorial-champion',
    id: championId,
    destination: `/assets/tft/champions/${slug(championId)}.png`,
    source: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championId}.png`,
  })
}

const downloaded = []
const stagingRoot = await mkdtemp(path.join(root, '.sync-tft-data-'))
try {
  for (const asset of assetRecords) {
    const destination = path.join(stagingRoot, asset.destination.replace(/^\//, ''))
    const result = await download(asset.source, destination)
    downloaded.push({ ...asset, ...result })
  }
  const promotedRoot = path.join(root, 'public', 'assets', 'tft')
  await rm(promotedRoot, { recursive: true, force: true })
  await mkdir(path.dirname(promotedRoot), { recursive: true })
  await cp(path.join(stagingRoot, 'assets', 'tft'), promotedRoot, { recursive: true })
} finally {
  await rm(stagingRoot, { recursive: true, force: true })
}

const generatedAt = new Date().toISOString()
const sourceManifest = {
  schemaVersion: 1,
  setId,
  gamePatch: '18.1-preview',
  sourceVersion,
  channel,
  generatedAt,
  sources: [
    { name: 'CommunityDragon PBE TFT', url: sourceUrl, sha256: sourceSha256 },
    { name: 'Riot Data Dragon champion art', version: ddragonVersion },
  ],
  completeness: {
    playableChampions: playableChampions.length,
    expectedTypicalRoster: 60,
    status: playableChampions.length >= 50 ? 'complete' : 'incomplete-preview',
  },
  assets: downloaded,
}

const outputDir = path.join(root, 'public', 'data')
await mkdir(outputDir, { recursive: true })
await writeFile(path.join(outputDir, 'champions.json'), JSON.stringify(playableChampions, null, 2))
await writeFile(path.join(outputDir, 'items.json'), JSON.stringify(normalizedItems, null, 2))
await writeFile(path.join(outputDir, 'source-manifest.json'), JSON.stringify(sourceManifest, null, 2))
await writeFile(path.join(root, 'public', 'status.json'), JSON.stringify({
  schemaVersion: 1,
  projectId: 'COMPFORGE-PRINT',
  status: 'preview',
  channel,
  setId,
  gamePatch: '18.1-preview',
  sourceVersion,
  generatedAt,
  counts: {
    champions: playableChampions.length,
    items: completedItems.length,
    components: components.length,
    builds: 6,
  },
  dataFreshness: sourceManifest.completeness.status,
  printQa: { letter: 'pending', a4: 'pending', inkSaver: 'pending' },
  legal: { disclaimersPresent: true, registrationStatus: 'not-submitted' },
}, null, 2))

console.log(JSON.stringify({
  status: 'synced',
  champions: playableChampions.length,
  recipes: completedItems.length,
  assets: downloaded.length,
  completeness: sourceManifest.completeness.status,
}, null, 2))
