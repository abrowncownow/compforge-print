export type Item = {
  id: string
  name: string
  description: string
  components: string[]
  icon: string
  sourceAsset: string
}

export type Build = {
  id: string
  title: string
  subtitle: string
  champion: string
  portrait: string
  traits: string[]
  primaryItems: string[]
  alternatives: string[]
  priorities: string[]
  note: string
  sourceLabel: string
  sourceUrl: string
}

export type PaperSize = 'letter' | 'a4'
export type Density = 'detailed' | 'compact'
export type InkMode = 'color' | 'ink-saver'
export type PrintTarget = 'builds' | 'recipes'
