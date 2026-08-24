export function readSelection(search: string, stored: string | null, validIds: Set<string>, fallback: string[]): string[] {
  const queryIds = new URLSearchParams(search).get('builds')?.split(',').filter((id) => validIds.has(id))
  if (queryIds?.length) return [...new Set(queryIds)]
  try {
    const storedIds: unknown = JSON.parse(stored || '[]')
    if (Array.isArray(storedIds)) {
      const filtered = storedIds.filter((id): id is string => typeof id === 'string' && validIds.has(id))
      if (filtered.length) return [...new Set(filtered)]
    }
  } catch {
    // Ignore invalid local preferences.
  }
  return fallback
}

export function writeSelection(search: string, selected: string[]) {
  const params = new URLSearchParams(search)
  if (selected.length) params.set('builds', selected.join(','))
  else params.delete('builds')
  const value = params.toString()
  return value ? `?${value}` : ''
}
