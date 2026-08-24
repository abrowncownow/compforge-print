import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { builds } from './data/builds'
import { readSelection, writeSelection } from './selection'
import type { Density, InkMode, Item, PaperSize, PrintTarget } from './types'

const baseUrl = import.meta.env.BASE_URL
const assetUrl = (path: string) => `${baseUrl}${path.replace(/^\//, '')}`
const validBuildIds = new Set(builds.map((build) => build.id))

function selectedFromLocation(): string[] {
  return readSelection(
    window.location.search,
    localStorage.getItem('compforge:selected'),
    validBuildIds,
    [builds[0].id],
  )
}

function waitForImages() {
  return Promise.all(
    [...document.images].map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
}

function App() {
  const [selected, setSelected] = useState<string[]>(selectedFromLocation)
  const [items, setItems] = useState<Item[]>([])
  const [dataError, setDataError] = useState('')
  const [paper, setPaper] = useState<PaperSize>('letter')
  const [density, setDensity] = useState<Density>('detailed')
  const [inkMode, setInkMode] = useState<InkMode>('color')

  const loadItems = useCallback(() => {
    fetch(`${baseUrl}data/items.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Item data returned ${response.status}`)
        return response.json() as Promise<Item[]>
      })
      .then((value) => { setItems(value); setDataError('') })
      .catch((error: Error) => setDataError(error.message))
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.search = writeSelection(url.search, selected)
    window.history.replaceState(null, '', url)
    localStorage.setItem('compforge:selected', JSON.stringify(selected))
  }, [selected])

  const selectedBuilds = useMemo(
    () => builds.filter((build) => selected.includes(build.id)),
    [selected],
  )
  const itemByName = useMemo(() => new Map(items.map((item) => [item.name, item])), [items])
  const components = useMemo(() => items.filter((item) => item.components.length === 0), [items])
  const recipeByPair = useMemo(() => {
    const result = new Map<string, Item>()
    for (const item of items) {
      if (item.components.length === 2) result.set([...item.components].sort().join('|'), item)
    }
    return result
  }, [items])
  const itemDataReady = components.length === 8 && recipeByPair.size === 36 && !dataError

  const toggleBuild = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const print = async (target: PrintTarget) => {
    if (!itemDataReady || (target === 'builds' && selected.length === 0)) return
    const root = document.documentElement
    root.dataset.printTarget = target
    root.dataset.density = density
    root.dataset.ink = inkMode
    const pageStyle = document.createElement('style')
    pageStyle.dataset.printPage = 'true'
    pageStyle.textContent = `@media print { @page { size: ${paper} ${target === 'recipes' ? 'landscape' : 'portrait'}; margin: ${target === 'recipes' ? '0.28in' : '0.42in'}; } }`
    document.head.appendChild(pageStyle)
    await new Promise(requestAnimationFrame)
    await waitForImages()
    window.print()
  }

  useEffect(() => {
    const cleanup = () => {
      delete document.documentElement.dataset.printTarget
      document.querySelector('style[data-print-page]')?.remove()
    }
    window.addEventListener('afterprint', cleanup)
    return () => window.removeEventListener('afterprint', cleanup)
  }, [])

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="CompForge Print home">
          <span className="wordmark-mark">CF</span><span>CompForge Print</span>
        </a>
        <nav aria-label="Page sections"><a href="#builds">Builds</a><a href="#items">Items</a><a href="#sources">Sources</a></nav>
        <div className="header-meta"><span className="status-dot" /> Set 18 · PBE preview</div>
      </header>

      <main id="top">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Build packets that belong on paper</p>
            <h1>Choose your lines.<br />Print the game plan.</h1>
            <p className="hero-copy">Select the comps you want beside you, then make a clean Letter or A4 packet. No overlay, no account, no tab maze.</p>
          </div>
          <aside className="packet-summary" aria-label="Current packet summary">
            <span className="packet-kicker">Your packet</span><strong>{selected.length}</strong>
            <span>{selected.length === 1 ? 'build selected' : 'builds selected'}</span>
            <button type="button" disabled={!selected.length || !itemDataReady} onClick={() => print('builds')}>{itemDataReady ? 'Print selected builds' : 'Validating item data…'}</button>
          </aside>
        </section>

        <section className="source-callout" role="status">
          <span>Preview honesty</span>
          <p>The current public Set 18 PBE snapshot exposes only two translated player units. These six guides are clearly labeled editorial drafts and are not live-tier or win-rate claims.</p>
        </section>

        <section className="controls-panel" aria-label="Print settings">
          <Choice label="Paper" values={[['letter', 'Letter'], ['a4', 'A4']]} selected={paper} onSelect={(value) => setPaper(value as PaperSize)} />
          <Choice label="Detail" values={[['detailed', 'Detailed'], ['compact', 'Compact']]} selected={density} onSelect={(value) => setDensity(value as Density)} />
          <Choice label="Ink" values={[['color', 'Color'], ['ink-saver', 'Ink saver']]} selected={inkMode} onSelect={(value) => setInkMode(value as InkMode)} />
          <button className="link-copy" type="button" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Copy packet link</button>
        </section>

        <section className="catalog-section" id="builds">
          <div className="section-heading">
            <div><p className="eyebrow">Set 18 preview catalog</p><h2>Pick the sheets you want</h2></div>
            <div className="catalog-actions"><span>{builds.length} editorial drafts</span><button type="button" onClick={() => setSelected(builds.map((build) => build.id))}>Select all</button><button type="button" onClick={() => setSelected([])}>Clear</button></div>
          </div>
          <div className="build-grid">
            {builds.map((build) => {
              const isSelected = selected.includes(build.id)
              return (
                <article className={`build-card ${isSelected ? 'selected' : ''}`} key={build.id}>
                  <button className="select-control" type="button" aria-pressed={isSelected} onClick={() => toggleBuild(build.id)}><span>{isSelected ? 'Selected' : 'Add to packet'}</span><span className="check">{isSelected ? '✓' : '+'}</span></button>
                  <div className="champion-row"><img src={assetUrl(build.portrait)} alt={`${build.champion} portrait`} /><div><span className="card-label">{build.subtitle}</span><h3>{build.title}</h3><p>{build.champion}</p></div></div>
                  <div className="chip-row">{build.traits.map((trait) => <span key={trait}>{trait}</span>)}</div>
                  <div className="item-list"><span>Primary item package</span><div className="item-icons">
                    {build.primaryItems.map((name) => { const item = itemByName.get(name); return <div key={name}>{item && <img src={assetUrl(item.icon)} alt="" />}<strong>{name}</strong></div> })}
                  </div></div>
                  <p className="build-note">{build.note}</p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="recipe-panel" id="items">
          <div><p className="eyebrow">Validated one-page reference</p><h2>Complete item recipe matrix</h2><p>All 36 core combinations from the reviewed PBE snapshot, with local art and source checksums.</p><button type="button" disabled={!itemDataReady} onClick={() => print('recipes')}>Print item matrix</button>{dataError && <p className="data-error">Item data unavailable: {dataError} <button type="button" onClick={loadItems}>Retry</button></p>}</div>
          <div className="recipe-preview" aria-label="Item recipe preview">{items.filter((item) => item.components.length === 2).slice(0, 6).map((item) => <div key={item.id}><img src={assetUrl(item.icon)} alt="" /><span>{item.name}</span></div>)}</div>
        </section>

        <section className="sources" id="sources">
          <div><p className="eyebrow">Provenance</p><h2>What this preview is—and is not</h2></div>
          <div><p>Build concepts and trait rosters come from Riot's official Enchanted Wilds overview. Item recipes and available PBE unit data come from a pinned CommunityDragon snapshot. Champion portraits use Riot-hosted game art.</p><a href="https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/enchanted-wilds-overview/">Official set overview ↗</a><a href="https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json">Pinned PBE data source ↗</a></div>
        </section>

        <section className="print-output print-builds" aria-label="Selected printable builds">
          {selectedBuilds.map((build) => (
            <article className="print-sheet" key={build.id}>
              <header className="print-sheet-header"><span>CompForge Print · Set 18 Preview</span><span>{paper.toUpperCase()} · {density}</span></header>
              <div className="print-title"><img src={assetUrl(build.portrait)} alt="" /><div><p>{build.subtitle}</p><h2>{build.title}</h2><span>{build.traits.join(' · ')}</span></div></div>
              <section className="print-section"><h3>Primary item package</h3><div className="print-items">{build.primaryItems.map((name) => <PrintItem key={name} name={name} item={itemByName.get(name)} />)}</div></section>
              <section className="print-section alternatives"><h3>Alternatives</h3><div className="print-items small">{build.alternatives.map((name) => <PrintItem key={name} name={name} item={itemByName.get(name)} />)}</div></section>
              <section className="print-section priorities"><h3>Component priority</h3><ol>{build.priorities.map((name) => <li key={name}>{name}</li>)}</ol></section>
              <blockquote>{build.note}</blockquote>
              <footer className="print-legal"><span>Editorial PBE preview · no live-tier or statistical claim · Source: {build.sourceLabel}</span><span>CompForge Print isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</span></footer>
            </article>
          ))}
        </section>

        <section className="print-output print-recipes" aria-label="Printable item recipe matrix">
          <article className="recipe-sheet">
            <header className="recipe-sheet-header"><div><span>CompForge Print · Set 18 Preview</span><h2>Item recipe matrix</h2></div><p>Combine the row and column components. Pinned PBE snapshot.</p></header>
            <div className="matrix"><div className="matrix-corner">+</div>{components.map((component) => <MatrixHeader key={`top-${component.id}`} item={component} />)}{components.map((row) => <div className="matrix-row" key={row.id}><MatrixHeader item={row} />{components.map((column) => { const result = recipeByPair.get([row.id, column.id].sort().join('|')); return <div className="matrix-cell" key={`${row.id}-${column.id}`}>{result && <><img src={assetUrl(result.icon)} alt="" /><span>{result.name}</span></>}</div> })}</div>)}</div>
            <footer className="recipe-legal">CompForge Print isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</footer>
          </article>
        </section>
      </main>

      <footer className="site-footer"><strong>CompForge Print</strong><div><p>CompForge Print isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p><p>CompForge Print was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.</p></div></footer>
    </div>
  )
}

function Choice({ label, values, selected, onSelect }: { label: string; values: string[][]; selected: string; onSelect: (value: string) => void }) {
  return <div><span className="control-label">{label}</span><div className="segmented">{values.map(([value, text]) => <button key={value} type="button" aria-pressed={selected === value} onClick={() => onSelect(value)}>{text}</button>)}</div></div>
}

function PrintItem({ name, item }: { name: string; item?: Item }) {
  return <div>{item && <img src={assetUrl(item.icon)} alt="" />}<strong>{name}</strong><span>Completed item</span></div>
}

function MatrixHeader({ item }: { item: Item }) {
  return <div className="matrix-header"><img src={assetUrl(item.icon)} alt="" /><span>{item.name}</span></div>
}

export default App
