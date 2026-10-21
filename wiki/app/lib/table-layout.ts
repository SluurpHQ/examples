export interface Sizing {
  /** The columns shown, in order. */
  names: string[]
  width: Record<string, number>
  least: Record<string, number>
  /** What each would like, its heading whole: given room to spare, it grows to this; squeezed, what is above it goes first. */
  want?: Record<string, number>
  /** The room the table has, 0 when not known yet. */
  room: number
  /** Width taken besides the columns: the row actions' column. */
  extra?: number
}

/** Each column's width in the room: grown to what it would like while there is room, then shrunk (but never below its least). */
export function fitWidths(s: Sizing): Record<string, number> {
  const out: Record<string, number> = {}
  for (const n of s.names) out[n] = s.width[n]!
  let over = s.names.reduce((sum, n) => sum + out[n]!, 0) + (s.extra ?? 0) - s.room
  if (!s.room) return out
  const want = (n: string) => Math.max(s.want?.[n] ?? 0, s.least[n] ?? 0)
  for (const n of s.names) {
    if (over >= 0) break
    const take = Math.min(-over, Math.max(0, want(n) - out[n]!))
    out[n]! += take
    over += take
  }
  if (over <= 0) return out
  const spare = s.names.reduce((sum, n) => sum + Math.max(0, out[n]! - want(n)), 0)
  if (spare > 0) {
    const part = Math.min(1, over / spare)
    for (const n of s.names) {
      const give = Math.floor(Math.max(0, out[n]! - want(n)) * part)
      out[n]! -= give
      over -= give
    }
  }
  for (const n of [...s.names].reverse()) {
    if (over <= 0) break
    const give = Math.max(0, Math.min(over, out[n]! - (s.least[n] ?? 0)))
    out[n]! -= give
    over -= give
  }
  return out
}

/** The widths after `name` is dragged to `want`: wider, the columns after it give; narrower than its least, those before it do. */
export function planResize(s: Sizing, name: string, want: number): Record<string, number> {
  const out = { ...s.width }
  const now = s.width[name]!
  const least = (n: string) => s.least[n] ?? 0
  const at = s.names.indexOf(name)
  let width = Math.max(least(name), Math.round(want))
  if (width > now && s.room) {
    const total = s.names.reduce((sum, n) => sum + s.width[n]!, 0) + (s.extra ?? 0)
    let over = width - now - Math.max(0, s.room - total)
    for (const n of s.names.slice(at + 1).reverse()) {
      if (over <= 0) break
      const give = Math.max(0, Math.min(over, out[n]! - least(n)))
      out[n]! -= give
      over -= give
    }
    if (over > 0) width = Math.max(now, width - over)
  }
  if (want < now && Math.round(want) < least(name)) {
    let under = least(name) - Math.round(want)
    for (const n of s.names.slice(0, at)) {
      if (under <= 0) break
      const give = Math.max(0, Math.min(under, out[n]! - least(n)))
      out[n]! -= give
      under -= give
    }
  }
  out[name] = width
  return out
}

/** The room inside a scroller for a table, less its borders and scrollbar. */
export function roomIn(scroller: HTMLElement): number {
  const cs = getComputedStyle(scroller)
  const borders = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
  return Math.floor(scroller.getBoundingClientRect().width - 2 - borders - (scroller.offsetWidth - scroller.clientWidth - borders))
}

export type SortKey = number | string

/** Rows sorted by a key: numbers as numbers, words as words with their numbers in order (item 2 before item 10). */
export function sortRows<Row>(rows: Row[], key: (row: Row) => SortKey, desc = false): Row[] {
  return [...rows].sort((a, b) => {
    const [x, y] = [key(a), key(b)]
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })
    return desc ? -c : c
  })
}

/** `from` moved to where `to` is. */
export function moveName(names: string[], from: string, to: string): string[] {
  const out = names.filter((n) => n !== from)
  out.splice(out.indexOf(to), 0, from)
  return out
}
