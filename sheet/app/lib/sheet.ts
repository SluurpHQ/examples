import { collect, computed, signal, untrack, type Signal } from "@sluurp/twist/signals"

export interface SheetCell {
  formula: string
  bold?: boolean
  /** Its look, as a formula of its own read from any cells: `=IF(SUM(A1:A3)>10, "red", "green")`; see `lookOf`. */
  format?: string
  /** Shown by one of the sheet's renderers, by name (and its options): `progress 0 100`. */
  renderer?: string
}

export interface SheetShape {
  columns: number
  rows: number
  hiddenColumns?: number[]
  hiddenRows?: number[]
  /** The columns' widths once set: part of the sheet, so every screen of a shared one has the same. */
  widths?: number[]
}

/** Where a sheet's cells are kept: each read as a signal, written by a patch. */
export interface SheetStore {
  cell(ref: string): () => SheetCell | undefined
  write(ref: string, patch: Partial<SheetCell>): void
  /** The sheet's shape, read reactively; kept by the sheet itself, for this screen alone, without one. */
  shape?(): SheetShape | undefined
  setShape?(shape: SheetShape): void
}

/** A sheet kept in memory, from formulas by reference: `{ A1: "Apples", B1: "=SUM(B2:B4)" }`. */
export function memoryStore(initial: Record<string, string> = {}): SheetStore {
  const cells = new Map<string, Signal<SheetCell | undefined>>()
  const of = (ref: string) => {
    let cell = cells.get(ref)
    if (!cell) cells.set(ref, (cell = signal<SheetCell | undefined>(undefined)))
    return cell
  }
  for (const [ref, formula] of Object.entries(initial)) of(ref).set({ formula })
  const shape = signal<SheetShape | undefined>(undefined)
  return {
    shape: () => shape(),
    setShape: (next) => shape.set(next),
    cell: (ref) => {
      const cell = of(ref)
      return () => cell()
    },
    write: (ref, patch) => {
      const cell = of(ref)
      cell.set({ formula: "", ...cell.peek(), ...patch })
    },
  }
}

/** A sheet kept somewhere else (a CRDT, a server), read through `get` and told of changes by `subscribe`. */
export function externalStore(source: {
  get(ref: string): SheetCell | undefined
  write(ref: string, patch: Partial<SheetCell>): void
  subscribe?(listener: (ref?: string) => void): () => void
}): SheetStore {
  const cells = new Map<string, Signal<SheetCell | undefined>>()
  const same = (a: SheetCell | undefined, b: SheetCell | undefined) => a?.formula === b?.formula && !!a?.bold === !!b?.bold && a?.format === b?.format && a?.renderer === b?.renderer
  const refresh = (ref: string) => {
    const cell = cells.get(ref)
    const now = source.get(ref)
    if (cell && !same(cell.peek(), now)) cell.set(now ? { ...now } : undefined)
  }
  source.subscribe?.((ref) => (ref === undefined ? [...cells.keys()].forEach(refresh) : refresh(ref)))
  return {
    cell: (ref) => {
      let cell = cells.get(ref)
      if (!cell) {
        const now = source.get(ref)
        cells.set(ref, (cell = signal<SheetCell | undefined>(now ? { ...now } : undefined)))
      }
      return () => cell!()
    },
    write: (ref, patch) => source.write(ref, patch),
  }
}

export type SheetValue = number | string | SheetValue[]
export type SheetFunction = (...args: SheetValue[]) => number | string

const flat = (args: SheetValue[]): (number | string)[] => args.flatMap((a) => (Array.isArray(a) ? flat(a) : [a]))
const numbers = (args: SheetValue[]) =>
  flat(args)
    .filter((v) => v !== "" && !Number.isNaN(Number(v)))
    .map(Number)
const num = (v: SheetValue | undefined) => (Array.isArray(v) ? (numbers(v)[0] ?? 0) : typeof v === "number" ? v : Number(v) || 0)

/** The functions every formula may call. */
export const SHEET_FUNCTIONS: Record<string, SheetFunction> = {
  SUM: (...a) => numbers(a).reduce((x, y) => x + y, 0),
  AVERAGE: (...a) => {
    const n = numbers(a)
    return n.length ? n.reduce((x, y) => x + y, 0) / n.length : "#DIV/0!"
  },
  MIN: (...a) => (numbers(a).length ? Math.min(...numbers(a)) : 0),
  MAX: (...a) => (numbers(a).length ? Math.max(...numbers(a)) : 0),
  COUNT: (...a) => numbers(a).length,
  ROUND: (x, places) => {
    const p = 10 ** num(places)
    return Math.round(num(x) * p) / p
  },
  ABS: (x) => Math.abs(num(x)),
  IF: (test, yes, no) => {
    const pass = typeof test === "string" ? test !== "" : num(test) !== 0
    const v = pass ? yes : no
    return v === undefined ? "" : Array.isArray(v) ? num(v) : v
  },
}

/** A reference in a formula, with its `$` fixing column or row; quoted text is matched first, so it is skipped. */
export const REF = /("[^"]*")|(?<![A-Z0-9_$])(\$?)([A-Z]+)(\$?)(\d+)\b(?!\s*\()/g

/** A column's letters from its index: 0 is A, 26 is AA. */
export function columnName(i: number): string {
  let name = ""
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}
export const columnIndex = (name: string) => [...name].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1

class SheetError extends Error {}

/**
 * A cell's formula worked out: text and numbers as they are; `=` and an expression of numbers, text in quotes,
 * references (A1, $A$1), ranges (A1:B3), + - * / &, comparisons, parentheses and functions. Errors as a sheet says
 * them: #REF!, #NAME?, #DIV/0!, #ERROR.
 */
export function evaluate(formula: string, get: (ref: string) => number | string, functions: Record<string, SheetFunction> = SHEET_FUNCTIONS): number | string {
  const text = formula.trim()
  if (!text.startsWith("=")) return text === "" ? "" : Number.isNaN(Number(text)) ? text : Number(text)
  if (text.includes("#REF!")) return "#REF!"
  const tokens = text.slice(1).match(/"[^"]*"|\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+|[A-Z_][A-Z0-9_.]*(?=\s*\()|\bTHIS\b|\$?[A-Z]+\$?\d+|\d+(?:\.\d+)?|<=|>=|<>|[-+*/()=<>,;&]/gi) ?? []
  let at = 0
  const peek = () => tokens[at]
  const span = (s: string): SheetValue[] => {
    const [from, to] = s.toUpperCase().replaceAll("$", "").split(":") as [string, string]
    const [c0, r0] = [columnIndex(from.match(/[A-Z]+/)![0]), Number(from.match(/\d+/)![0])]
    const [c1, r1] = [columnIndex(to.match(/[A-Z]+/)![0]), Number(to.match(/\d+/)![0])]
    const out: SheetValue[] = []
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) out.push(get(`${columnName(c)}${r}`))
    return out
  }
  const atom = (): SheetValue => {
    const t = tokens[at++] ?? ""
    if (t === "(") {
      const v = compare()
      at++
      return v
    }
    if (t === "-") return -num(atom())
    if (t === "+") return num(atom())
    if (t.startsWith('"')) return t.slice(1, -1)
    if (/^\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+$/i.test(t)) return span(t)
    if (/^[A-Z_][A-Z0-9_.]*$/i.test(t) && peek() === "(") {
      at++
      const args: SheetValue[] = []
      while (peek() !== undefined && peek() !== ")") {
        args.push(compare())
        if (peek() === "," || peek() === ";") at++
      }
      at++
      const fn = functions[t.toUpperCase()]
      if (!fn) throw new SheetError("#NAME?")
      return fn(...args)
    }
    if (/^THIS$/i.test(t)) return get("THIS")
    if (/^\$?[A-Z]+\$?\d+$/i.test(t)) return get(t.toUpperCase().replaceAll("$", ""))
    if (t !== "" && !Number.isNaN(Number(t))) return Number(t)
    throw new SheetError("#ERROR")
  }
  const product = (): SheetValue => {
    let v = atom()
    while (peek() === "*" || peek() === "/") v = tokens[at++] === "*" ? num(v) * num(atom()) : num(v) / num(atom())
    return v
  }
  const sum = (): SheetValue => {
    let v = product()
    while (peek() === "+" || peek() === "-" || peek() === "&") {
      const op = tokens[at++]
      const w = product()
      v = op === "&" ? `${flat([v]).join("")}${flat([w]).join("")}` : op === "+" ? num(v) + num(w) : num(v) - num(w)
    }
    return v
  }
  const compare = (): SheetValue => {
    const v = sum()
    const op = peek()
    if (!["=", "<>", "<", ">", "<=", ">="].includes(op ?? "")) return v
    at++
    const w = sum()
    const [x, y] = typeof v === "string" || typeof w === "string" ? [String(v), String(w)] : [num(v), num(w)]
    const out = op === "=" ? x === y : op === "<>" ? x !== y : op === "<" ? x < y : op === ">" ? x > y : op === "<=" ? x <= y : x >= y
    return out ? 1 : 0
  }
  try {
    const v = compare()
    const one = Array.isArray(v) ? num(v) : v
    if (typeof one === "number") return Number.isFinite(one) ? Math.round(one * 1e6) / 1e6 : "#DIV/0!"
    return one
  } catch (e) {
    return e instanceof SheetError ? e.message : "#ERROR"
  }
}

const TINTS: Record<string, [string, string, string]> = {
  red: ["bg-red-100 text-red-900 dark:bg-red-500/25 dark:text-red-100", "text-red-700 dark:text-red-300", "border-red-500"],
  orange: ["bg-orange-100 text-orange-900 dark:bg-orange-500/25 dark:text-orange-100", "text-orange-700 dark:text-orange-300", "border-orange-500"],
  amber: ["bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100", "text-amber-700 dark:text-amber-300", "border-amber-500"],
  yellow: ["bg-yellow-100 text-yellow-900 dark:bg-yellow-500/25 dark:text-yellow-100", "text-yellow-700 dark:text-yellow-300", "border-yellow-500"],
  lime: ["bg-lime-100 text-lime-900 dark:bg-lime-500/25 dark:text-lime-100", "text-lime-700 dark:text-lime-300", "border-lime-500"],
  green: ["bg-green-100 text-green-900 dark:bg-green-500/25 dark:text-green-100", "text-green-700 dark:text-green-300", "border-green-500"],
  emerald: ["bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100", "text-emerald-700 dark:text-emerald-300", "border-emerald-500"],
  teal: ["bg-teal-100 text-teal-900 dark:bg-teal-500/25 dark:text-teal-100", "text-teal-700 dark:text-teal-300", "border-teal-500"],
  cyan: ["bg-cyan-100 text-cyan-900 dark:bg-cyan-500/25 dark:text-cyan-100", "text-cyan-700 dark:text-cyan-300", "border-cyan-500"],
  sky: ["bg-sky-100 text-sky-900 dark:bg-sky-500/25 dark:text-sky-100", "text-sky-700 dark:text-sky-300", "border-sky-500"],
  blue: ["bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-100", "text-blue-700 dark:text-blue-300", "border-blue-500"],
  indigo: ["bg-indigo-100 text-indigo-900 dark:bg-indigo-500/25 dark:text-indigo-100", "text-indigo-700 dark:text-indigo-300", "border-indigo-500"],
  violet: ["bg-violet-100 text-violet-900 dark:bg-violet-500/25 dark:text-violet-100", "text-violet-700 dark:text-violet-300", "border-violet-500"],
  purple: ["bg-purple-100 text-purple-900 dark:bg-purple-500/25 dark:text-purple-100", "text-purple-700 dark:text-purple-300", "border-purple-500"],
  pink: ["bg-pink-100 text-pink-900 dark:bg-pink-500/25 dark:text-pink-100", "text-pink-700 dark:text-pink-300", "border-pink-500"],
  rose: ["bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-100", "text-rose-700 dark:text-rose-300", "border-rose-500"],
  gray: ["bg-gray-100 text-gray-900 dark:bg-gray-500/25 dark:text-gray-100", "text-gray-700 dark:text-gray-300", "border-gray-500"],
}
const TAILWIND = /^(?:[a-z0-9-]+:)*!?-?[a-z][a-z0-9-]*(?:-(?:\[[^\s\]]+\]|[a-z0-9./%-]+))*(?:\/\d+)?$/

/**
 * A look said as words, as classes: a colour (`red`) fills the cell, `text:green` colours its words,
 * `border:amber` its edge, `bold` thickens them; anything else that reads as a Tailwind class is kept as it is.
 */
export function lookOf(said: number | string): string {
  const out: string[] = []
  for (const word of String(said).split(/[\s,;]+/)) {
    const lower = word.toLowerCase()
    if (lower === "bold") {
      out.push("font-semibold")
      continue
    }
    const [part, colour] = lower.includes(":") ? (lower.split(":") as [string, string]) : ["bg", lower]
    const tint = TINTS[colour]
    if (tint && ["bg", "background", "text", "color", "border"].includes(part)) out.push(part === "text" || part === "color" ? tint[1] : part === "border" ? tint[2] : tint[0])
    else if (TAILWIND.test(word)) out.push(word)
  }
  return out.join(" ")
}

/**
 * A sheet's working: each cell read once from the store, each value a computed, cycles caught (`#CYCLE`), a
 * reference past the sheet's edge `#REF!`. `stop` lets go of every computed.
 */
export function sheetOf(store: SheetStore, functions: Record<string, SheetFunction>, count: () => { c: number; r: number }, onEvaluate?: (ref: string) => void) {
  const within = (ref: string) => {
    const m = /^([A-Z]+)(\d+)$/.exec(ref)
    return !!m && columnIndex(m[1]!) < count().c && Number(m[2]) >= 1 && Number(m[2]) <= count().r
  }
  const cells = new Map<string, () => SheetCell | undefined>()
  const cellOf = (ref: string) => {
    let read = cells.get(ref)
    if (!read) cells.set(ref, (read = untrack(() => collect(() => store.cell(ref)))[0]))
    return read
  }
  const values = new Map<string, () => number | string>()
  const stops: (() => void)[] = []
  const evaluating = new Set<string>()
  const cycled: boolean[] = []
  const read = (other: string): number | string => {
    if (!within(other)) return "#REF!"
    if (evaluating.has(other)) {
      cellOf(other)()
      cycled[cycled.length - 1] = true
      return "#CYCLE"
    }
    const v = valueOf(other)()
    if (v === "#CYCLE") cycled[cycled.length - 1] = true
    return v
  }
  const valueOf = (ref: string): (() => number | string) => {
    let value = values.get(ref)
    if (!value) {
      const cell = cellOf(ref)
      const [made, stop] = untrack(() =>
        collect(() =>
          computed(() => {
            onEvaluate?.(ref)
            evaluating.add(ref)
            cycled.push(false)
            try {
              const out = evaluate(cell()?.formula ?? "", read, functions)
              return cycled[cycled.length - 1] ? "#CYCLE" : out
            } finally {
              evaluating.delete(ref)
              cycled.pop()
            }
          }),
        ),
      )
      stops.push(stop)
      values.set(ref, (value = made))
    }
    return value
  }
  /** What a look or renderer reads: any cell's value, or a formula of its own. */
  const api = {
    value: (ref: string) => (within(ref) ? valueOf(ref)() : "#REF!"),
    evaluate: (formula: string) => evaluate(formula, (other) => (within(other) ? valueOf(other)() : "#REF!"), functions),
  }
  /** A cell's own look (its `format` formula, THIS being its value), as classes. */
  const lookFor = (ref: string) => {
    const cell = cellOf(ref)()
    return cell?.format ? lookOf(evaluate(cell.format, (other) => (other === "THIS" ? valueOf(ref)() : within(other) ? valueOf(other)() : "#REF!"), functions)) : ""
  }
  return { within, cellOf, valueOf, api, lookFor, stop: () => stops.forEach((s) => s()) }
}

export type SheetApi = ReturnType<typeof sheetOf>["api"]
