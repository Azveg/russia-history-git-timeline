export function eraGraphAnchor(id: string): string {
  return `era-${id}`;
}

export function chronicleEraAnchor(id: string): string {
  return `chronicle-era-${id}`;
}

export function timelineEventAnchor(id: string, mode: 'graph' | 'chronicle'): string {
  return mode === 'graph' ? `row-${id}` : `chronicle-ev-${id}`;
}
