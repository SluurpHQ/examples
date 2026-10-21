import * as React from "react"
import { computed, signal } from "@sluurp/twist/signals"
import { useSignal } from "@sluurp/react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { columnIndex, columnName, memoryStore, REF, SHEET_FUNCTIONS, sheetOf, type SheetApi, type SheetCell, type SheetFunction, type SheetShape, type SheetStore } from "@/lib/sheet"

type SheetAt = { c: number; r: number }
type SheetArea = { c0: number; c1: number; r0: number; r1: number }
type SheetPresence = {
  id: string
  name: string
  color: string
  area: SheetArea
  /** The cells they hold (typed in, or their look being set): locked to everybody else. */
  holds?: string[]
  /** When they took hold (ms): of two holding the same cell, the earlier keeps it. */
  since?: number
}
type SheetRenderer = (value: number | string, ref: string, sheet: SheetApi, args: string[]) => React.ReactNode
type Box = { left: number; top: number; width: number; height: number }
type Who = { name: string; color: string }
type Clip = { rows: { formula: string; bold: boolean }[][]; from: SheetAt }

const CLIP = "application/x-sluurp-cells"
const TH = "h-8 cursor-default border border-border bg-muted p-0 font-medium text-muted-foreground"
const TD = "h-8 overflow-hidden border border-border p-0"
const NARROWEST = 42
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i)
const refOf = ({ c, r }: SheetAt) => `${columnName(c)}${r + 1}`
const sameArea = (x: SheetArea, y: SheetArea) => x.c0 === y.c0 && x.c1 === y.c1 && x.r0 === y.r0 && x.r1 === y.r1

/** Several people on the same cells: an edge striped in each one's colour. */
function edgeOf(people: Who[]): React.CSSProperties {
  if (people.length < 2) return {}
  const step = 100 / people.length
  return { borderImage: `linear-gradient(90deg, ${people.map((p, i) => `${p.color} ${i * step}% ${(i + 1) * step}%`).join(", ")}) 1` }
}

/** Names too long for the box they label run past, round and round. */
function Names({ people, width }: { people: Who[]; width: number }) {
  const box = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => {
    const el = box.current
    const run = el?.firstElementChild as HTMLElement | null
    if (!el || !run || run.scrollWidth <= el.clientWidth) return
    const copy = run.cloneNode(true) as HTMLElement
    copy.setAttribute("aria-hidden", "true")
    el.append(copy)
    const lap = run.offsetWidth + 12
    const runs = [run, copy].map((part) => ((part.style.marginRight = "12px"), part.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${lap}px)` }], { duration: (lap / 40) * 1000, iterations: Infinity })))
    return () => (runs.forEach((a) => a.cancel()), copy.remove())
  }, [people.map((p) => p.name).join(), width])
  return (
    <span ref={box} className="absolute -top-[15px] -right-px flex overflow-hidden rounded-t-[3px] whitespace-nowrap" style={{ maxWidth: Math.max(24, width) }}>
      <span className="flex flex-none gap-px">
        {people.map((p) => (
          <b key={p.name} className="px-1 text-[10px] leading-[14px] font-medium text-white" style={{ background: p.color }}>
            {p.name}
          </b>
        ))}
      </span>
    </span>
  )
}

/**
 * A spreadsheet: cells of text, numbers and formulas (`=SUM(A1:A3)`), worked out again as the cells they read
 * change; chosen by dragging, moved through by the arrow keys, typed in with Enter or a double click; copied,
 * cut and pasted (formulas moved as a sheet moves them); columns and rows inserted, deleted, hidden, dragged into
 * order and resized from their menus; a cell's look a formula of its own, its value shown by a renderer. Kept in
 * `store` (in memory by default), shared with others whose choices show in their colours.
 */
function Spreadsheet({
  store: given,
  columns = 4,
  rows = 5,
  functions: extra,
  widthsKey,
  waiting = false,
  others = [],
  onSelect,
  onHold,
  format,
  renderers,
  onEvaluate,
  onTable,
  label = "Sheet",
}: {
  store?: SheetStore
  columns?: number
  rows?: number
  /** Functions its formulas may call, beside SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS and IF. */
  functions?: Record<string, SheetFunction>
  /** Where this browser keeps the columns' widths; this visit only without one. */
  widthsKey?: string
  /** Its cells on their way: drawn faded and still meanwhile. */
  waiting?: boolean
  /** What others have chosen, in their colours. */
  others?: SheetPresence[]
  onSelect?: (area: SheetArea) => void
  /** The cells held here, as that changes: shared with the others, they are locked to them. */
  onHold?: (refs: string[], since: number) => void
  /** A cell's look from its value, or any cells read through `sheet`: class names. */
  format?: (value: number | string, ref: string, sheet: SheetApi) => string | undefined | null | false
  /** Ways of showing a cell by name (a cell says which, from its menu); one with `options` asks for them. */
  renderers?: Record<string, SheetRenderer | { render: SheetRenderer; options?: string }>
  onEvaluate?: (ref: string) => void
  /** Its table, once made: for what is laid over it (live cursors). */
  onTable?: (table: HTMLTableElement) => void
  label?: string
}) {
  // The working: the shape and every cell's value as signals, made once.
  const work = React.useMemo(() => {
    const store = given ?? memoryStore()
    const kept = signal<SheetShape>({ columns, rows })
    const shape = computed(() => store.shape?.() ?? kept(), { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) })
    const functions = { ...SHEET_FUNCTIONS, ...Object.fromEntries(Object.entries(extra ?? {}).map(([k, f]) => [k.toUpperCase(), f])) }
    const sheet = sheetOf(store, functions, () => ({ c: shape().columns, r: shape().rows }), onEvaluate)
    return { store, kept, shape, sheet, setShape: (next: SheetShape) => (store.setShape ? store.setShape(next) : kept.set(next)) }
  }, [given])
  React.useEffect(() => work.sheet.stop, [work])
  const [shape] = useSignal(work.shape)
  const { sheet, store, setShape } = work
  const count = { c: shape.columns, r: shape.rows }
  const LAST = { c: count.c - 1, r: count.r - 1 }
  const hiddenColumns = new Set(shape.hiddenColumns ?? [])
  const hiddenRows = new Set(shape.hiddenRows ?? [])

  // Who holds what: cells others hold are locked here.
  const lockedBy = React.useMemo(() => {
    const by = new Map<string, Who & { since: number }>()
    for (const o of others) for (const ref of o.holds ?? []) by.set(ref, { name: o.name, color: o.color, since: o.since ?? 0 })
    return by
  }, [others])
  const locked = (ref: string) => lockedBy.has(ref)
  const write = (ref: string, change: Partial<SheetCell>) => !locked(ref) && store.write(ref, change)

  // What is chosen: an anchor and a focus, as cells, whole columns or whole rows.
  const [editing, setEditing] = React.useState<string | null>(null)
  const [anchor, setAnchor] = React.useState<SheetAt>({ c: 0, r: 0 })
  const [focus, setFocus] = React.useState<SheetAt>({ c: 0, r: 0 })
  const [chosen, setChosen] = React.useState<"cells" | "columns" | "rows">("cells")
  const area: SheetArea = { c0: Math.min(anchor.c, focus.c), c1: Math.max(anchor.c, focus.c), r0: Math.min(anchor.r, focus.r), r1: Math.max(anchor.r, focus.r) }
  const told = React.useRef<SheetArea | null>(null)
  React.useEffect(() => {
    if (told.current && sameArea(told.current, area)) return
    told.current = area
    onSelect?.(area)
  })
  const inArea = (c: number, r: number) => c >= area.c0 && c <= area.c1 && r >= area.r0 && r <= area.r1
  const columnMarked = (c: number) => chosen === "columns" && area.c0 <= c && c <= area.c1
  const rowMarked = (r: number) => chosen === "rows" && area.r0 <= r && r <= area.r1
  const chosenRefs = () => range(area.c0, area.c1).flatMap((c) => range(area.r0, area.r1).map((r) => refOf({ c, r })))
  const edit = (ref: string) => !locked(ref) && setEditing(ref)
  // Somebody else took hold of the cell typed in here, earlier: it is theirs.
  const since = React.useRef(0)
  React.useEffect(() => {
    const theirs = editing ? lockedBy.get(editing) : undefined
    if (theirs && theirs.since <= since.current) setEditing(null)
  }, [lockedBy, editing])

  const grid = React.useRef<HTMLDivElement>(null)
  const table = React.useRef<HTMLTableElement>(null)
  const catcher = React.useRef<HTMLTextAreaElement>(null)
  const refocus = () => grid.current?.focus({ preventScroll: true })
  const drag = React.useRef<{ kind: "cells" | "columns" | "rows" | null; moving: { from: number; to: number } | null }>({ kind: null, moving: null })
  const [dropBefore, setDropBefore] = React.useState<number | null>(null)
  const dropRef = React.useRef<number | null>(null)
  dropRef.current = dropBefore

  function press(at: SheetAt, e: { button: number; shiftKey: boolean }, kind: "cells" | "columns" | "rows") {
    if (e.button !== 0 || editing) return
    // Chosen columns pressed again: dragged elsewhere.
    if (kind === "columns" && !e.shiftKey && chosen === "columns" && at.c >= area.c0 && at.c <= area.c1) {
      drag.current.moving = { from: area.c0, to: area.c1 }
      return refocus()
    }
    const from = kind === "columns" ? { c: at.c, r: 0 } : kind === "rows" ? { c: 0, r: at.r } : at
    const to = kind === "columns" ? { c: at.c, r: LAST.r } : kind === "rows" ? { c: LAST.c, r: at.r } : at
    if (e.shiftKey) setFocus(kind === "columns" ? { c: at.c, r: anchor.r === 0 ? LAST.r : 0 } : kind === "rows" ? { c: anchor.c === 0 ? LAST.c : 0, r: at.r } : at)
    else {
      setChosen(kind)
      setAnchor(from)
      setFocus(to)
    }
    drag.current.kind = kind
    refocus()
  }
  function over(at: SheetAt, kind: "cells" | "columns" | "rows") {
    const moving = drag.current.moving
    if (kind === "columns" && moving) setDropBefore(at.c >= moving.from ? at.c + 1 : at.c)
    if (drag.current.kind !== kind || moving) return
    setFocus((f) => (kind === "columns" ? { c: at.c, r: f.r } : kind === "rows" ? { c: f.c, r: at.r } : at))
  }

  // Columns or rows put elsewhere, as a spreadsheet does it: contents moved, every formula and look pointed at where
  // the cells it reads went (#REF! for a gone one), the shape and the widths with them.
  function restructure(col: (c: number) => number | null, row: (r: number) => number | null, next: SheetShape) {
    if (lockedBy.size) return
    const cellAt = (c: number, r: number) => {
      const nc = col(c)
      const nr = row(r)
      return nc === null || nr === null ? null : { c: nc, r: nr }
    }
    const repoint = (formula: string | undefined) =>
      !formula || !formula.startsWith("=")
        ? formula
        : formula.replace(REF, (_all, quoted: string | undefined, fixC: string, letters: string, fixR: string, digits: string) => {
            if (quoted) return quoted
            const to = cellAt(columnIndex(letters), Number(digits) - 1)
            return to ? `${fixC}${columnName(to.c)}${fixR}${to.r + 1}` : "#REF!"
          })
    const moved: { at: SheetAt; cell: SheetCell }[] = []
    const held = new Set<string>()
    for (let c = 0; c < count.c; c++)
      for (let r = 0; r < count.r; r++) {
        const cell = sheet.cellOf(refOf({ c, r }))()
        if (!cell || (!cell.formula && !cell.bold && !cell.format && !cell.renderer)) continue
        held.add(refOf({ c, r }))
        const to = cellAt(c, r)
        if (to) moved.push({ at: to, cell: { ...cell, formula: repoint(cell.formula) ?? "", format: repoint(cell.format) } })
      }
    const landed = new Set(moved.map((m) => refOf(m.at)))
    for (const ref of held) if (!landed.has(ref)) store.write(ref, { formula: "", bold: false, format: "", renderer: "" })
    for (const m of moved) store.write(refOf(m.at), { formula: m.cell.formula, bold: !!m.cell.bold, format: m.cell.format ?? "", renderer: m.cell.renderer ?? "" })
    const keep = (s: number[] | undefined, f: (i: number) => number | null) => (s ?? []).map(f).filter((i): i is number => i !== null)
    const nextWidths = Array.from({ length: next.columns }, (): number => WIDE)
    widths.forEach((w, c) => {
      const to = col(c)
      if (to !== null && to < next.columns) nextWidths[to] = w
    })
    setShape({ ...next, widths: nextWidths, hiddenColumns: keep(shape.hiddenColumns, col), hiddenRows: keep(shape.hiddenRows, row) })
    saveWidths(nextWidths, false)
    const a = { c: Math.min(anchor.c, next.columns - 1), r: Math.min(anchor.r, next.rows - 1) }
    setAnchor(a)
    setFocus(a)
    setChosen("cells")
  }
  const insertColumn = (at: number) => restructure((c) => (c >= at ? c + 1 : c), (r) => r, { ...shape, columns: count.c + 1 })
  const deleteColumn = (at: number) => count.c > 1 && restructure((c) => (c === at ? null : c > at ? c - 1 : c), (r) => r, { ...shape, columns: count.c - 1 })
  const insertRow = (at: number) => restructure((c) => c, (r) => (r >= at ? r + 1 : r), { ...shape, rows: count.r + 1 })
  const deleteRow = (at: number) => count.r > 1 && restructure((c) => c, (r) => (r === at ? null : r > at ? r - 1 : r), { ...shape, rows: count.r - 1 })
  const moveColumns = (from: number, to: number, before: number) => {
    if (before >= from && before <= to + 1) return
    const order = range(0, count.c - 1).filter((i) => i < from || i > to)
    const at = before > to ? before - (to - from + 1) : before
    order.splice(at, 0, ...range(from, to))
    const where = new Map(order.map((old, now) => [old, now]))
    restructure((c) => where.get(c) ?? c, (r) => r, shape)
    setAnchor({ c: at, r: 0 })
    setFocus({ c: at + (to - from), r: LAST.r })
    setChosen("columns")
  }
  const hide = (kind: "columns" | "rows", at: number[]) => {
    const key = kind === "columns" ? "hiddenColumns" : "hiddenRows"
    const next = [...new Set([...(shape[key] ?? []), ...at])]
    if (next.length >= (kind === "columns" ? count.c : count.r)) return // one always shown
    setShape({ ...shape, [key]: next })
  }
  const unhide = (kind: "columns" | "rows") => setShape({ ...shape, [kind === "columns" ? "hiddenColumns" : "hiddenRows"]: [] })

  // Let go anywhere: a drag of cells ends, columns being moved land.
  React.useEffect(() => {
    const letGo = () => {
      drag.current.kind = null
      const moving = drag.current.moving
      drag.current.moving = null
      if (!moving) return
      const before = dropRef.current
      setDropBefore(null)
      if (before !== null) moveColumns(moving.from, moving.to, before)
    }
    addEventListener("pointerup", letGo)
    return () => removeEventListener("pointerup", letGo)
  })

  const clear = () => chosenRefs().forEach((ref) => sheet.cellOf(ref)()?.formula && write(ref, { formula: "" }))
  const toggleBold = () => {
    const refs = chosenRefs()
    const bold = !refs.every((ref) => sheet.cellOf(ref)()?.bold)
    for (const ref of refs) write(ref, { bold })
  }
  /** A formula moved by (dc, dr), as one pasted elsewhere is: `=A1*2` a row down is `=A2*2`; `$` keeps a part. */
  const moved = (formula: string, dc: number, dr: number) =>
    !formula.startsWith("=")
      ? formula
      : formula.replace(REF, (_all, quoted: string | undefined, fixC: string, col: string, fixR: string, row: string) => {
          if (quoted) return quoted
          const c = columnIndex(col) + (fixC ? 0 : dc)
          const r = Number(row) + (fixR ? 0 : dr)
          return c >= 0 && c <= LAST.c && r >= 1 && r <= count.r ? `${fixC}${columnName(c)}${fixR}${r}` : "#REF!"
        })
  const copied = (e: React.ClipboardEvent) => {
    if (editing) return
    e.preventDefault()
    const clip: Clip = { rows: [], from: { c: area.c0, r: area.r0 } }
    const text: string[] = []
    for (const r of range(area.r0, area.r1)) {
      const row: Clip["rows"][number] = []
      const shown: string[] = []
      for (const c of range(area.c0, area.c1)) {
        const ref = refOf({ c, r })
        const cell = sheet.cellOf(ref)()
        row.push({ formula: cell?.formula ?? "", bold: !!cell?.bold })
        shown.push(String(sheet.valueOf(ref)()))
      }
      clip.rows.push(row)
      text.push(shown.join("\t"))
    }
    e.clipboardData.setData("text/plain", text.join("\n"))
    e.clipboardData.setData(CLIP, JSON.stringify(clip))
  }
  const pasted = (e: React.ClipboardEvent) => {
    if (editing) return
    e.preventDefault()
    const own = e.clipboardData.getData(CLIP)
    let rows: { formula: string; bold?: boolean }[][]
    let from: SheetAt | null = null
    if (own) {
      const clip = JSON.parse(own) as Clip
      rows = clip.rows
      from = clip.from
    } else {
      const text = e.clipboardData.getData("text/plain").replace(/\r/g, "").replace(/\n$/, "")
      if (!text) return
      rows = text.split("\n").map((line) => line.split("\t").map((formula) => ({ formula })))
    }
    // One cell pasted into many fills them all; many paste as they were.
    const single = rows.length === 1 && rows[0]!.length === 1
    const span = single ? { r: area.r1 - area.r0 + 1, c: area.c1 - area.c0 + 1 } : { r: rows.length, c: Math.max(...rows.map((r) => r.length)) }
    for (let dr = 0; dr < span.r; dr++)
      for (let dc = 0; dc < span.c; dc++) {
        const at = { c: area.c0 + dc, r: area.r0 + dr }
        if (at.c > LAST.c || at.r > LAST.r) continue
        const src = single ? rows[0]![0] : rows[dr]?.[dc]
        if (!src) continue
        const srcAt = from ? { c: from.c + (single ? 0 : dc), r: from.r + (single ? 0 : dr) } : at
        const formula = moved(src.formula, at.c - srcAt.c, at.r - srcAt.r)
        write(refOf(at), src.bold === undefined ? { formula } : { formula, bold: src.bold })
      }
    setAnchor({ c: area.c0, r: area.r0 })
    setFocus({ c: Math.min(LAST.c, area.c0 + span.c - 1), r: Math.min(LAST.r, area.r0 + span.r - 1) })
  }
  const keys = (e: React.KeyboardEvent) => {
    if (editing) return
    const mod = (e.ctrlKey || e.metaKey) && !e.altKey
    if ((e.key === "Delete" || e.key === "Backspace") && !mod && !e.altKey) return e.preventDefault(), clear()
    // The clipboard reads a selection: a hidden field takes the keys for a moment.
    if (mod && ["c", "x", "v"].includes(e.key.toLowerCase()) && catcher.current) {
      catcher.current.value = " "
      catcher.current.focus({ preventScroll: true })
      catcher.current.select()
      return void setTimeout(refocus, 0)
    }
    if (mod && e.key.toLowerCase() === "b") return e.preventDefault(), toggleBold()
    const step = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key]
    if (step) {
      e.preventDefault()
      const to = { ...(e.shiftKey ? focus : anchor) }
      do {
        to.c = Math.min(LAST.c, Math.max(0, to.c + step[0]))
        to.r = Math.min(LAST.r, Math.max(0, to.r + step[1]))
      } while ((hiddenColumns.has(to.c) || hiddenRows.has(to.r)) && to.c > 0 && to.r > 0 && to.c < LAST.c && to.r < LAST.r)
      setFocus(to)
      if (!e.shiftKey) (setAnchor(to), setChosen("cells"))
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault()
      edit(refOf(anchor))
    }
  }

  // Widths: kept in the sheet's shape (shared), and in this browser.
  const WIDE = typeof matchMedia !== "undefined" && matchMedia("(max-width: 480px)").matches ? 76 : 112
  const [widths, setWidths] = React.useState<number[]>(() => {
    try {
      const kept = widthsKey ? JSON.parse(localStorage.getItem(widthsKey) ?? "null") : null
      if (Array.isArray(kept)) return kept.map((w) => Math.max(NARROWEST, Number(w) || WIDE))
    } catch {}
    return Array.from({ length: columns }, () => WIDE)
  })
  const widening = React.useRef(false)
  React.useEffect(() => {
    if (!Array.isArray(shape.widths) || widening.current) return
    const next = shape.widths.map((w) => Math.max(NARROWEST, Number(w) || WIDE))
    if (JSON.stringify(next) !== JSON.stringify(widths)) setWidths(next)
  }, [shape.widths])
  const saveWidths = (next: number[], shared = true) => {
    setWidths(next)
    if (shared) setShape({ ...work.shape(), widths: next })
    try {
      if (widthsKey) localStorage.setItem(widthsKey, JSON.stringify(next))
    } catch {}
  }
  const widthOf = (c: number) => widths[c] ?? WIDE
  const widthsWith = (c: number, w: number, from = widths) => Array.from({ length: Math.max(count.c, from.length) }, (_, i) => (i === c ? Math.max(NARROWEST, Math.round(w)) : (from[i] ?? WIDE)))

  // The look dialog, and a renderer's options.
  const [looking, setLooking] = React.useState<{ ref: string; draft: string } | null>(null)
  const [options, setOptions] = React.useState<{ name: string; says: string; draft: string } | null>(null)
  const saveLook = (format: string) => {
    for (const ref of chosenRefs()) write(ref, { format })
    setLooking(null)
    refocus()
  }
  const showAs = (renderer: string) => chosenRefs().forEach((ref) => write(ref, { renderer }))
  const openOptions = (name: string, says: string) => {
    if (chosenRefs().some(locked)) return
    const now = (sheet.cellOf(refOf(anchor))()?.renderer ?? "").split(/\s+/)
    setOptions({ name, says, draft: now[0] === name ? now.slice(1).join(" ") : "" })
  }
  // What is held here, told as it changes: the cell typed in, or those a dialog is setting.
  const holding = editing ? [editing] : looking || options ? chosenRefs() : []
  const held = React.useRef("")
  React.useEffect(() => {
    if (held.current === holding.join()) return
    held.current = holding.join()
    since.current = holding.length ? since.current || Date.now() + Math.random() : 0
    onHold?.(holding, since.current)
  })

  // The menu: for a cell, a column's letter or a row's number, set as it opens.
  const [menu, setMenu] = React.useState<{ kind: "cell" } | { kind: "column"; at: number } | { kind: "row"; at: number }>({ kind: "cell" })
  const items: { label?: string; shortcut?: string; separator?: boolean; disabled?: boolean; onSelect?: () => void }[] =
    menu.kind === "column"
      ? [
          { label: "Insert column left", onSelect: () => insertColumn(menu.at) },
          { label: "Insert column right", onSelect: () => insertColumn(menu.at + 1) },
          { label: "Delete column", disabled: count.c <= 1, onSelect: () => deleteColumn(menu.at) },
          { separator: true },
          { label: "Hide column", onSelect: () => hide("columns", chosen === "columns" ? range(area.c0, area.c1) : [menu.at]) },
          { label: "Show hidden columns", disabled: !hiddenColumns.size, onSelect: () => unhide("columns") },
        ]
      : menu.kind === "row"
        ? [
            { label: "Insert row above", onSelect: () => insertRow(menu.at) },
            { label: "Insert row below", onSelect: () => insertRow(menu.at + 1) },
            { label: "Delete row", disabled: count.r <= 1, onSelect: () => deleteRow(menu.at) },
            { separator: true },
            { label: "Hide row", onSelect: () => hide("rows", chosen === "rows" ? range(area.r0, area.r1) : [menu.at]) },
            { label: "Show hidden rows", disabled: !hiddenRows.size, onSelect: () => unhide("rows") },
          ]
        : [
            {
              label: "Look…",
              onSelect: () => !chosenRefs().some(locked) && setLooking({ ref: refOf(anchor), draft: sheet.cellOf(refOf(anchor))()?.format ?? "" }),
            },
            ...Object.entries(renderers ?? {}).map(([name, r]) =>
              typeof r !== "function" && r.options ? { label: `Show as ${name}…`, onSelect: () => openOptions(name, r.options!) } : { label: `Show as ${name}`, onSelect: () => showAs(name) },
            ),
            ...(renderers ? [{ label: "Show as value", onSelect: () => showAs("") }] : []),
            { label: "Bold", shortcut: "Ctrl+B", onSelect: toggleBold },
            { separator: true },
            { label: "Clear", shortcut: "Del", onSelect: clear },
          ]

  // The outlines: mine, and the others', measured off the cells they cover.
  const [outline, setOutline] = React.useState<Box>({ left: 0, top: 0, width: 0, height: 0 })
  const [theirs, setTheirs] = React.useState<{ id: string; people: Who[]; box: Box }[]>([])
  React.useLayoutEffect(() => {
    const el = grid.current
    const boxOf = (a: SheetArea): Box | null => {
      const first = table.current?.querySelector<HTMLElement>(`td[data-ref="${refOf({ c: a.c0, r: a.r0 })}"]`)
      const last = table.current?.querySelector<HTMLElement>(`td[data-ref="${refOf({ c: Math.min(a.c1, LAST.c), r: Math.min(a.r1, LAST.r) })}"]`)
      if (!el || !first || !last) return null
      const box = el.getBoundingClientRect()
      const f = first.getBoundingClientRect()
      const l = last.getBoundingClientRect()
      return { left: f.left - box.left, top: f.top - box.top, width: l.right - f.left, height: l.bottom - f.top }
    }
    const measure = () => {
      const mine = boxOf(area)
      if (mine) setOutline((now) => (JSON.stringify(now) === JSON.stringify(mine) ? now : mine))
      const byArea = new Map<string, { id: string; people: Who[]; box: Box }>()
      for (const o of others) {
        const box = o.area && typeof o.area.c0 === "number" ? boxOf(o.area) : null
        if (!box) continue
        const key = `${o.area.c0},${o.area.c1},${o.area.r0},${o.area.r1}`
        const same = byArea.get(key)
        if (same) same.people.push({ name: o.name, color: o.color })
        else byArea.set(key, { id: o.id, people: [{ name: o.name, color: o.color }], box })
      }
      const next = [...byArea.values()]
      setTheirs((now) => (JSON.stringify(now) === JSON.stringify(next) ? now : next))
    }
    measure()
    addEventListener("resize", measure)
    return () => removeEventListener("resize", measure)
  }, [area.c0, area.c1, area.r0, area.r1, widths, shape, others])
  React.useEffect(() => void (table.current && onTable?.(table.current)), [])

  const shownColumns = range(0, LAST.c).filter((c) => !hiddenColumns.has(c))
  const shownRows = range(0, LAST.r).filter((r) => !hiddenRows.has(r))
  return (
    <div data-slot="spreadsheet" className="max-w-full overflow-x-auto pr-8 pb-8">
      <div
        ref={grid}
        data-sheet=""
        className="group/sheet relative inline-block text-sm text-foreground outline-none select-none"
        tabIndex={0}
        role="grid"
        aria-label={label}
        onKeyDown={keys}
        onCopy={copied}
        onCut={(e) => !editing && (copied(e), clear())}
        onPaste={pasted}
      >
        <ContextMenu>
          <ContextMenuTrigger
            render={
              <table
                ref={table}
                className={cn("table-fixed border-collapse transition-opacity", waiting && "pointer-events-none opacity-45")}
                aria-busy={waiting}
                style={{ width: 32 + shownColumns.reduce((sum, c) => sum + widthOf(c), 0) }}
              />
            }
          >
            <colgroup>
              <col style={{ width: 32 }} />
              {shownColumns.map((c) => (
                <col key={c} style={{ width: widthOf(c) }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={TH} />
                {shownColumns.map((c) => (
                  <th
                    key={c}
                    data-col={columnName(c)}
                    className={cn(
                      TH,
                      "relative",
                      columnMarked(c) && "bg-blue-600/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200",
                      dropBefore === c && "shadow-[inset_2px_0_0_#2563eb]",
                      dropBefore === c + 1 && "shadow-[inset_-2px_0_0_#2563eb]",
                    )}
                    onPointerDown={(e) => press({ c, r: 0 }, e, "columns")}
                    onPointerEnter={() => over({ c, r: 0 }, "columns")}
                    onContextMenu={() => {
                      setMenu({ kind: "column", at: c })
                      if (!columnMarked(c)) press({ c, r: 0 }, { button: 0, shiftKey: false }, "columns")
                      drag.current = { kind: null, moving: null }
                    }}
                  >
                    {columnName(c)}
                    <span
                      className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize touch-none after:absolute after:top-1/4 after:left-[3px] after:h-1/2 after:w-0.5 after:rounded-full after:content-[''] hover:after:bg-blue-600 active:after:bg-blue-600"
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`Width of column ${columnName(c)}`}
                      aria-valuenow={widthOf(c)}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return
                        e.stopPropagation()
                        e.preventDefault()
                        const handle = e.currentTarget
                        handle.setPointerCapture(e.pointerId)
                        const from = e.clientX
                        const was = widthOf(c)
                        let last = widths
                        widening.current = true
                        const move = (m: PointerEvent) => setWidths((now) => (last = widthsWith(c, was + m.clientX - from, now)))
                        const done = () => {
                          widening.current = false
                          saveWidths(last)
                          handle.removeEventListener("pointermove", move)
                          handle.removeEventListener("pointerup", done)
                          handle.removeEventListener("pointercancel", done)
                        }
                        handle.addEventListener("pointermove", move)
                        handle.addEventListener("pointerup", done)
                        handle.addEventListener("pointercancel", done)
                      }}
                      onDoubleClick={(e) => (e.stopPropagation(), saveWidths(widthsWith(c, WIDE)))}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shownRows.map((r) => (
                <tr key={r}>
                  <th
                    data-row={r + 1}
                    className={cn(TH, rowMarked(r) && "bg-blue-600/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200")}
                    onPointerDown={(e) => press({ c: 0, r }, e, "rows")}
                    onPointerEnter={() => over({ c: 0, r }, "rows")}
                    onContextMenu={() => {
                      setMenu({ kind: "row", at: r })
                      if (!rowMarked(r)) press({ c: 0, r }, { button: 0, shiftKey: false }, "rows")
                      drag.current.kind = null
                    }}
                  >
                    {r + 1}
                  </th>
                  {shownColumns.map((c) => {
                    const ref = refOf({ c, r })
                    return (
                      <Cell
                        key={ref}
                        reference={ref}
                        sheet={sheet}
                        picked={inArea(c, r)}
                        editing={editing === ref}
                        lockedBy={lockedBy.get(ref)}
                        format={format}
                        renderers={renderers}
                        onPress={(e) => press({ c, r }, e, "cells")}
                        onOver={() => over({ c, r }, "cells")}
                        onMenu={() => {
                          setMenu({ kind: "cell" })
                          if (inArea(c, r)) return
                          setChosen("cells")
                          setAnchor({ c, r })
                          setFocus({ c, r })
                        }}
                        onEdit={() => edit(ref)}
                        onDone={(formula) => {
                          setEditing(null)
                          refocus()
                          if (formula !== undefined && formula !== (sheet.cellOf(ref)()?.formula ?? "")) write(ref, { formula })
                        }}
                      />
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-52">
            {items.map((item, i) =>
              item.separator ? (
                <ContextMenuSeparator key={i} />
              ) : (
                <ContextMenuItem key={i} disabled={item.disabled} onClick={item.onSelect}>
                  {item.label}
                  {item.shortcut && <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>}
                </ContextMenuItem>
              ),
            )}
          </ContextMenuContent>
        </ContextMenu>
        {theirs.map((t) => (
          <div
            key={t.id}
            className="pointer-events-none absolute box-border border"
            aria-hidden="true"
            style={{ ...t.box, borderColor: t.people[0]!.color, background: `color-mix(in srgb, ${t.people[0]!.color} 8%, transparent)`, ...edgeOf(t.people) }}
          >
            <Names people={t.people} width={t.box.width} />
          </div>
        ))}
        {/* A column after the last, a row after the last: by the sheet's edges, shown as the pointer is over it. */}
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute top-0 -right-8 h-8 w-7 bg-muted text-muted-foreground opacity-0 group-hover/sheet:opacity-100 focus-visible:opacity-100"
          aria-label="Add column"
          onClick={() => insertColumn(count.c)}
        >
          +
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute -bottom-8 left-0 h-7 w-8 bg-muted text-muted-foreground opacity-0 group-hover/sheet:opacity-100 focus-visible:opacity-100"
          aria-label="Add row"
          onClick={() => insertRow(count.r)}
        >
          +
        </Button>
        <textarea ref={catcher} className="pointer-events-none absolute top-0 left-0 h-px w-px resize-none border-0 p-0 opacity-0 select-text" aria-hidden="true" tabIndex={-1} />
        <div className="pointer-events-none absolute box-border border border-blue-600 bg-blue-600/10" aria-hidden="true" style={outline} />
      </div>
      <Dialog open={!!looking} onOpenChange={(open) => !open && setLooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Look of {looking?.ref}</DialogTitle>
            <DialogDescription>
              A formula that says how the cell looks: a colour (red, text:green, border:amber, bold) or any Tailwind classes (bg-orange-500 text-white). THIS is the cell's own value: =IF(THIS&gt;10, "red", "").
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => (e.preventDefault(), saveLook(looking?.draft.trim() ?? ""))}>
            <Input
              autoFocus
              className="font-mono text-xs"
              placeholder={'=IF(SUM(A1:A3)>10, "red", "green")'}
              aria-label="Look"
              value={looking?.draft ?? ""}
              onChange={(e) => setLooking((l) => l && { ...l, draft: e.target.value })}
            />
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => saveLook("")}>
              Remove
            </Button>
            <Button onClick={() => saveLook(looking?.draft.trim() ?? "")}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!options} onOpenChange={(open) => !open && setOptions(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show as {options?.name}</DialogTitle>
            <DialogDescription>Options, a space between: {options?.says}. Leave empty for the defaults.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (options) showAs(`${options.name} ${options.draft.trim()}`.trim())
              setOptions(null)
              refocus()
            }}
          >
            <Input
              autoFocus
              className="font-mono text-xs"
              placeholder={options?.says}
              aria-label="Options"
              value={options?.draft ?? ""}
              onChange={(e) => setOptions((o) => o && { ...o, draft: e.target.value })}
            />
          </form>
          <DialogFooter>
            <Button
              onClick={() => {
                if (options) showAs(`${options.name} ${options.draft.trim()}`.trim())
                setOptions(null)
                refocus()
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** One cell: its formula, value and look read as signals, so it alone is drawn again when they change. */
function Cell({
  reference,
  sheet,
  picked,
  editing,
  lockedBy,
  format,
  renderers,
  onPress,
  onOver,
  onMenu,
  onEdit,
  onDone,
}: {
  reference: string
  sheet: ReturnType<typeof sheetOf>
  picked: boolean
  editing: boolean
  lockedBy?: Who
  format?: (value: number | string, ref: string, sheet: SheetApi) => string | undefined | null | false
  renderers?: Record<string, SheetRenderer | { render: SheetRenderer; options?: string }>
  onPress: (e: React.PointerEvent) => void
  onOver: () => void
  onMenu: () => void
  onEdit: () => void
  /** Typing done: the formula to keep, or nothing when it was let go. */
  onDone: (formula?: string) => void
}) {
  const [cell] = useSignal(() => sheet.cellOf(reference)())
  const [value] = useSignal(() => sheet.valueOf(reference)())
  const [look] = useSignal(() => cn(format ? format(sheet.valueOf(reference)(), reference, sheet.api) || "" : "", sheet.lookFor(reference)))
  const [name, ...args] = (cell?.renderer ?? "").split(/\s+/).filter(Boolean)
  const given = name ? renderers?.[name] : undefined
  const render = typeof given === "function" ? given : given?.render
  const numeric = typeof value === "number"
  return (
    <td
      data-ref={reference}
      className={cn(TD, look, cell?.bold && "font-semibold")}
      aria-selected={picked}
      aria-readonly={lockedBy ? true : undefined}
      onPointerDown={onPress}
      onPointerEnter={onOver}
      onContextMenu={onMenu}
      onDoubleClick={onEdit}
      style={
        lockedBy
          ? {
              boxShadow: `inset 0 0 0 2px ${lockedBy.color}`,
              backgroundImage: `repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in oklab, ${lockedBy.color} 14%, transparent) 6px 8px)`,
            }
          : undefined
      }
    >
      {editing ? (
        <input
          autoFocus
          className={cn("block h-full w-full min-w-0 border-0 bg-transparent px-2 text-inherit tabular-nums outline-none select-text", numeric ? "text-right" : "text-left")}
          style={{ font: "inherit" }}
          aria-label={reference}
          defaultValue={cell?.formula ?? ""}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === "Enter") onDone(e.currentTarget.value)
            else if (e.key === "Escape") onDone()
          }}
          onBlur={(e) => onDone(e.currentTarget.value)}
        />
      ) : (
        <output className={cn("block overflow-hidden px-2 text-ellipsis whitespace-nowrap tabular-nums", numeric ? "text-right" : "text-left")}>
          {render ? render(value, reference, sheet.api, args) : String(value)}
        </output>
      )}
    </td>
  )
}

export { Spreadsheet, type SheetArea, type SheetAt, type SheetPresence, type SheetRenderer }
export { memoryStore, externalStore, evaluate, lookOf, columnName, SHEET_FUNCTIONS, type SheetCell, type SheetShape, type SheetStore, type SheetFunction } from "@/lib/sheet"
