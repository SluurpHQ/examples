import * as React from "react"
import { ChevronDownIcon, Columns3Icon, ListFilterIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pager } from "@/components/sluurp/pager"
import { useControllable } from "@/hooks/use-controllable"
import { fitWidths, moveName, planResize, roomIn, sortRows, type Sizing, type SortKey } from "@/lib/table-layout"
import { word } from "@/lib/words"

type SmartColumn<Row> = {
  key: string
  label?: React.ReactNode
  /** Beside the label in the heading. */
  icon?: React.ReactNode
  /** Numbers right-aligned and totalled; a yes or no counted; a date sorted as one. */
  type?: "text" | "number" | "bool" | "date"
  /** How a value is written: currency (`currency`, EUR by default), percent (0.25 is 25%), integer, date, or Intl's options. */
  format?: "currency" | "percent" | "integer" | "date" | Intl.NumberFormatOptions
  currency?: string
  /** The value sorted, filtered and totalled, when it is not `row[key]`; `null` while it is on its way. */
  value?: (row: Row) => unknown
  /** How the cell is drawn, when not as its value written. */
  cell?: (row: Row) => React.ReactNode
  /** The words a value is written as, for search and sorting, when the cell draws something else. */
  text?: (row: Row) => string
  align?: "left" | "center" | "right"
  /** Its choices in their order: sorted by that order rather than A to Z. */
  values?: string[]
  /** A filter of its own: a choice of its words, yes or no, or a range of numbers. */
  filter?: boolean
  noTotal?: boolean
  /** Its width to begin with, and how narrow it may be dragged. */
  width?: number
  minWidth?: number
  /** Hidden to begin with; shown from the columns menu. */
  hidden?: boolean
}

type TableLook = { order: string[]; hidden: string[]; sort: { key: string; desc?: boolean } | null; widths: Record<string, number> }

const MANY = 200
const TICK = 40
const ACTIONS = 48
const ALIGN = { left: "", center: "text-center", right: "text-right" }

const readLook = (key?: string): TableLook | null => {
  if (!key) return null
  try {
    const v = localStorage.getItem(`sluurp.table.${key}`)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

/**
 * Rows as a table that does what spreadsheets do: sorted by a heading, searched, filtered by a column's values,
 * columns resized, dragged into order and hidden (kept in this browser, or by the app as `look`), rows ticked,
 * counted and totalled in the footer, paged or loaded as the end comes into view; past a few hundred rows only
 * those in view are drawn.
 */
function SmartTable<Row>({
  columns = [],
  rows = [],
  toolbar,
  search = false,
  start,
  actions,
  footer = true,
  resizable = true,
  reorderable = true,
  hideable = false,
  selectable = false,
  selected,
  onSelectedChange,
  rowActions,
  onRowClick,
  rowKey = (r) => r,
  empty,
  count,
  sortBy,
  look: lookGiven,
  onLookChange,
  storageKey,
  pageSize,
  paging = "pages",
  loadMore,
  remote = false,
  onSearch,
  maxHeight = 520,
  className,
}: {
  columns?: SmartColumn<Row>[]
  rows?: Row[]
  /** The toolbar above: on when it has something to hold, unless false. */
  toolbar?: boolean
  search?: boolean
  /** The app's own controls at the toolbar's start (a view switcher) and end (a New button). */
  start?: React.ReactNode
  actions?: React.ReactNode
  footer?: boolean
  resizable?: boolean
  reorderable?: boolean
  hideable?: boolean
  selectable?: boolean
  selected?: Row[]
  onSelectedChange?: (rows: Row[]) => void
  /** Each row's own actions, in a narrow column at its end. */
  rowActions?: (row: Row) => React.ReactNode
  /** A row pressed (or Enter on it); a button or link in it is its own. */
  onRowClick?: (row: Row) => void
  /** A row's identity, for keeping ticks as rows are replaced. */
  rowKey?: (row: Row) => unknown
  empty?: React.ReactNode
  /** The footer's count: `(n) => n === 1 ? "1 page" : `${n} pages``. */
  count?: (n: number) => string
  sortBy?: { key: string; desc?: boolean }
  /** Sorting, hidden columns, order and widths, held by the app to keep where it likes. */
  look?: TableLook
  onLookChange?: (look: TableLook) => void
  /** Without `look`, where this browser keeps it between visits. */
  storageKey?: string
  pageSize?: number
  paging?: "pages" | "infinite"
  /** Asked for more rows as the last are scrolled to. */
  loadMore?: () => unknown
  /**
   * The rows come sorted and searched by whoever gives them (a server's query, over more rows than are here): the
   * table shows them as they are, and says what was asked for, a sort by `onLookChange`, words by `onSearch`.
   */
  remote?: boolean
  /** The words typed in the search box, as they change. */
  onSearch?: (words: string) => void
  maxHeight?: number
  className?: string
}) {
  const lang = typeof document !== "undefined" ? document.documentElement.lang || undefined : undefined
  const [look, setLook] = useControllable<TableLook>(
    lookGiven,
    () => readLook(storageKey) ?? { order: [], hidden: columns.filter((c) => c.hidden).map((c) => c.key), sort: sortBy ?? null, widths: {} },
    onLookChange,
  )
  React.useEffect(() => {
    if (lookGiven || !storageKey) return
    try {
      localStorage.setItem(`sluurp.table.${storageKey}`, JSON.stringify(look))
    } catch {}
  }, [look])
  const valueOf = (c: SmartColumn<Row>, row: Row) => (c.value ? c.value(row) : (row as Record<string, unknown>)[c.key])
  const numeric = (c: SmartColumn<Row>) => c.type === "number"
  const alignOf = (c: SmartColumn<Row>) => c.align ?? (numeric(c) ? "right" : "left")
  const labelText = (c: SmartColumn<Row>) => (typeof c.label === "string" ? c.label : c.key)
  const ordered = React.useMemo(() => {
    const at = (c: SmartColumn<Row>) => (look.order.includes(c.key) ? look.order.indexOf(c.key) : look.order.length + columns.indexOf(c))
    return [...columns].sort((a, b) => at(a) - at(b))
  }, [columns, look.order])
  const visible = ordered.filter((c) => !look.hidden.includes(c.key))

  const written = (c: SmartColumn<Row>, v: unknown): string => {
    if (v === null) return "…"
    if (v === undefined || v === "") return ""
    if (c.type === "bool") return v === true ? "✓" : ""
    if (c.format === "date" || c.type === "date") {
      const d = v instanceof Date ? v : new Date(v as string)
      return Number.isNaN(d.getTime()) ? String(v) : new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(d)
    }
    const n = Number(v)
    if (!c.format || !Number.isFinite(n)) return String(v)
    const options: Intl.NumberFormatOptions =
      c.format === "currency"
        ? { style: "currency", currency: c.currency ?? "EUR" }
        : c.format === "percent"
          ? { style: "percent", maximumFractionDigits: 1 }
          : c.format === "integer"
            ? { maximumFractionDigits: 0 }
            : c.format
    return new Intl.NumberFormat(lang, options).format(n)
  }
  const textOf = (c: SmartColumn<Row>, row: Row) => (c.text ? c.text(row) : written(c, valueOf(c, row)))

  // Finding: the search, and each column's filter.
  const [term, setTerm] = React.useState("")
  const [chosen, setChosen] = React.useState<Record<string, string>>({})
  const [low, setLow] = React.useState<Record<string, string>>({})
  const [high, setHigh] = React.useState<Record<string, string>>({})
  const keyOf = (c: SmartColumn<Row>) => (row: Row): SortKey => {
    const v = valueOf(c, row)
    if (c.values) return c.values.indexOf(String(v ?? ""))
    if (c.type === "date" || c.format === "date") return new Date(v as string).getTime() || 0
    if (numeric(c) || c.type === "bool") return Number(v ?? 0)
    return textOf(c, row).toLowerCase()
  }
  const shown = React.useMemo(() => {
    if (remote) return rows
    const words = term.trim().toLowerCase()
    const listed = rows.filter((row) => {
      if (words && !columns.some((c) => textOf(c, row).toLowerCase().includes(words))) return false
      for (const c of columns) {
        if (!c.filter) continue
        const v = valueOf(c, row)
        const pick = chosen[c.key]
        if (pick && c.type === "bool" && (pick === "yes") !== (v === true)) return false
        if (pick && c.type !== "bool" && !numeric(c) && String(v ?? "") !== pick) return false
        if (numeric(c)) {
          const n = Number(v)
          if (low[c.key] && !(n >= Number(low[c.key]))) return false
          if (high[c.key] && !(n <= Number(high[c.key]))) return false
        }
      }
      return true
    })
    const column = look.sort && columns.find((c) => c.key === look.sort!.key)
    return column ? sortRows(listed, keyOf(column), look.sort!.desc) : listed
  }, [rows, columns, term, chosen, low, high, look.sort, remote])
  const sortOf = (c: SmartColumn<Row>) => (look.sort?.key === c.key ? (look.sort.desc ? "desc" : "asc") : null)
  const cycleSort = (c: SmartColumn<Row>) => {
    const s = look.sort
    setLook({ ...look, sort: s?.key === c.key ? (s.desc ? null : { key: c.key, desc: true }) : { key: c.key, desc: false } })
  }

  // Ticking: kept by key, so ticks stay as the rows are replaced.
  const [picked, setPickedOwn] = React.useState(() => new Set((selected ?? []).map(rowKey)))
  const isPicked = (row: Row) => picked.has(rowKey(row))
  const pickedShown = shown.filter(isPicked)
  const setPicked = (next: Set<unknown>) => {
    setPickedOwn(next)
    onSelectedChange?.(rows.filter((r) => next.has(rowKey(r))))
  }
  const toggle = (row: Row, on: boolean) => {
    const next = new Set(picked)
    on ? next.add(rowKey(row)) : next.delete(rowKey(row))
    setPicked(next)
  }
  const allPicked = shown.length > 0 && shown.every(isPicked)

  // Widths: each as set, fitted to the room there is.
  const lastColumn = !!rowActions || hideable
  const extra = (selectable ? TICK : 0) + (lastColumn ? ACTIONS : 0)
  const leastOf = (c: SmartColumn<Row>) => c.minWidth ?? (c.type === "bool" ? 48 : 80)
  const setWidth = (c: SmartColumn<Row>) => {
    const set = look.widths[c.key]
    if (typeof set === "number" && Number.isFinite(set)) return Math.max(set, leastOf(c))
    if (c.width) return c.width
    return Math.max(c.type === "bool" ? 96 : numeric(c) || c.type === "date" ? 140 : 200, Math.min(260, Math.ceil(labelText(c).length * 7.5) + 64))
  }
  const [room, setRoom] = React.useState(0)
  const dragging = React.useRef(false)
  const sizing = (): Sizing => ({
    names: visible.map((c) => c.key),
    width: Object.fromEntries(visible.map((c) => [c.key, setWidth(c)])),
    least: Object.fromEntries(visible.map((c) => [c.key, leastOf(c)])),
    want: Object.fromEntries(visible.map((c) => [c.key, Math.ceil(labelText(c).length * 7.5) + 40])),
    room,
    extra,
  })
  const fitted = fitWidths(sizing())
  const widthOf = (c: SmartColumn<Row>) => fitted[c.key] ?? setWidth(c)
  const total = visible.reduce((sum, c) => sum + widthOf(c), 0) + extra
  const saveWidths = (widths: Record<string, number>) => setLook({ ...look, widths: { ...look.widths, ...widths } })
  const table = React.useRef<HTMLTableElement>(null)
  const sizer = React.useRef<HTMLDivElement>(null)

  /** A heading's right edge: dragged, or moved with the arrow keys; a double click puts it back. */
  const Resizer = ({ c }: { c: SmartColumn<Row> }) => (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`${word("resize")} ${labelText(c)}`}
      // Its value is the column's width, as a focusable separator must say.
      aria-valuenow={Math.round(widthOf(c))}
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuetext={`${Math.round(widthOf(c))} px`}
      tabIndex={0}
      className="absolute top-1 -right-1 z-10 h-6 w-2 cursor-col-resize touch-none rounded-full outline-none select-none after:absolute after:inset-y-1 after:left-[3px] after:w-0.5 after:rounded-full hover:after:bg-ring/50 focus-visible:after:bg-ring"
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => (e.preventDefault(), e.stopPropagation())}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const from = e.clientX
        const snap = { ...sizing(), width: fitted }
        let widths = snap.width
        let frame = 0
        dragging.current = true
        // While dragging, the columns are set straight on the page; React is told once it is let go.
        const move = (m: PointerEvent) => {
          widths = planResize(snap, c.key, snap.width[c.key]! + m.clientX - from)
          if (frame) return
          frame = requestAnimationFrame(() => {
            frame = 0
            for (const [name, w] of Object.entries(widths)) {
              const col = table.current?.querySelector<HTMLElement>(`col[data-col="${CSS.escape(name)}"]`)
              if (col) col.style.width = `${w}px`
            }
            if (sizer.current) sizer.current.style.width = `max(100%, ${Object.values(widths).reduce((s, w) => s + w, 0) + extra}px)`
          })
        }
        const up = () => {
          removeEventListener("pointermove", move)
          removeEventListener("pointerup", up)
          cancelAnimationFrame(frame)
          document.body.style.cursor = ""
          dragging.current = false
          if (widths[c.key] !== snap.width[c.key]) saveWidths(widths)
        }
        document.body.style.cursor = "col-resize"
        addEventListener("pointermove", move)
        addEventListener("pointerup", up)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        const { [c.key]: _, ...widths } = look.widths
        setLook({ ...look, widths })
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
        const step = e.shiftKey ? 64 : 16
        const snap = { ...sizing(), width: fitted }
        saveWidths(planResize(snap, c.key, snap.width[c.key]! + (e.key === "ArrowLeft" ? -step : step)))
        e.preventDefault()
      }}
    />
  )

  const sumOf = (c: SmartColumn<Row>, of: Row[]) => {
    if (c.noTotal) return ""
    if (c.type === "bool") return `${of.filter((row) => valueOf(c, row) === true).length} / ${of.length}`
    if (!numeric(c) || c.format === "percent") return ""
    let sum = 0
    for (const row of of) {
      const v = valueOf(c, row)
      if (v === null) return "…"
      const n = Number(v)
      if (Number.isFinite(n)) sum += n
    }
    return written(c, Math.round(sum * 100) / 100)
  }
  const counted = (n: number) => (count ? count(n) : (n === 1 ? word("row-one") : word("rows")).replace("{n}", String(n)))

  // Paging, loading more, and drawing only what is in view past many rows.
  const [scrolled, setScrolled] = React.useState(0)
  const [rowHeight, setRowHeight] = React.useState(41)
  const [page, setPage] = React.useState(1)
  const [reached, setReached] = React.useState(pageSize ?? 0)
  const pages = pageSize ? Math.max(1, Math.ceil(shown.length / pageSize)) : 1
  const at = Math.min(page, pages)
  const paged = !pageSize ? shown : paging === "infinite" ? shown.slice(0, reached) : shown.slice((at - 1) * pageSize, at * pageSize)
  const many = !pageSize && shown.length > MANY
  const first = many ? Math.max(0, Math.floor(scrolled / rowHeight) - 10) : 0
  const last = many ? Math.min(paged.length, first + Math.ceil(maxHeight / rowHeight) + 20) : paged.length
  const asking = React.useRef(false)
  const more = async () => {
    if (reached < shown.length) return setReached(reached + pageSize!)
    if (!loadMore || asking.current) return
    asking.current = true
    try {
      await loadMore()
      setReached((n) => n + pageSize!)
    } finally {
      asking.current = false
    }
  }
  const end = React.useRef<HTMLTableRowElement>(null)
  React.useEffect(() => {
    if (paging !== "infinite" || !pageSize || !end.current) return
    const seen = new IntersectionObserver(([e]) => e!.isIntersecting && more(), { rootMargin: "200px" })
    seen.observe(end.current)
    return () => seen.disconnect()
  })
  const scroller = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = scroller.current!
    const resized = new ResizeObserver(() => dragging.current || setRoom(roomIn(el)))
    resized.observe(el)
    const row = table.current?.querySelector<HTMLElement>("tbody tr:not([aria-hidden])")
    if (row?.offsetHeight) setRowHeight(row.offsetHeight)
    return () => resized.disconnect()
  }, [many])

  // Columns dragged into order by their headings.
  const [draggingCol, setDraggingCol] = React.useState<string | null>(null)
  const [overCol, setOverCol] = React.useState<string | null>(null)
  const span = visible.length + (selectable ? 1 : 0) + (lastColumn ? 1 : 0)
  const filters = columns.filter((c) => c.filter)
  const active = filters.filter((c) => chosen[c.key] || low[c.key] || high[c.key]).length
  const hasToolbar = toolbar ?? (search || !!start || !!actions || filters.length > 0)
  const scrolls = many || (paging === "infinite" && !!pageSize)

  const tableEl = (
    <table ref={table} data-slot="table" className={cn("w-full caption-bottom text-sm", resizable && "table-fixed")}>
      {resizable && (
        <colgroup>
          {selectable && <col style={{ width: TICK }} />}
          {visible.map((c) => (
            <col key={c.key} data-col={c.key} style={{ width: widthOf(c) }} />
          ))}
          {/* The last takes what is left, so every other is exactly as wide as set. */}
          {lastColumn && <col />}
        </colgroup>
      )}
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          {selectable && (
            <TableHead className="px-2">
              <Checkbox
                aria-label={word("select-all")}
                checked={allPicked}
                indeterminate={!allPicked && pickedShown.length > 0}
                onCheckedChange={(on) => setPicked(on ? new Set(shown.map(rowKey)) : new Set())}
              />
            </TableHead>
          )}
          {visible.map((c) => {
            const sort = sortOf(c)
            const align = alignOf(c)
            return (
              <TableHead
                key={c.key}
                className={cn("relative px-1 whitespace-nowrap", ALIGN[align])}
                aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
                draggable={reorderable}
                onDragStart={(e) => (setDraggingCol(c.key), e.dataTransfer.setData("text/plain", c.key))}
                onDragOver={(e) => {
                  if (!draggingCol || draggingCol === c.key) return
                  e.preventDefault()
                  setOverCol(c.key)
                }}
                onDragLeave={() => setOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggingCol && draggingCol !== c.key) setLook({ ...look, order: moveName(ordered.map((x) => x.key), draggingCol, c.key) })
                  setDraggingCol(null)
                  setOverCol(null)
                }}
                onDragEnd={() => (setDraggingCol(null), setOverCol(null))}
              >
                <button
                  type="button"
                  className={cn(
                    "flex h-7 w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md px-1.5 font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    align === "right" ? "flex-row-reverse text-right" : align === "center" ? "justify-center" : "text-left",
                    reorderable && "cursor-grab active:cursor-grabbing",
                    overCol === c.key && "ring-2 ring-ring/40",
                    draggingCol === c.key && "opacity-50",
                  )}
                  onClick={() => cycleSort(c)}
                >
                  {c.icon && <span className="flex shrink-0 [&>svg]:size-3.5">{c.icon}</span>}
                  <span className="truncate">{c.label ?? c.key}</span>
                  {/* Only on the column sorted by: the others keep no room for an arrow they do not have. */}
                  {sort && <ChevronDownIcon className={cn("size-3 shrink-0 text-foreground", sort === "asc" && "rotate-180")} />}
                </button>
                {resizable && <Resizer c={c} />}
              </TableHead>
            )
          })}
          {lastColumn && (
            <TableHead className="px-1 text-center">
              {hideable && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={word("columns")} />}>
                    <Columns3Icon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {ordered.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={!look.hidden.includes(c.key)}
                        onCheckedChange={() => {
                          // Never the last one shown.
                          if (!look.hidden.includes(c.key) && visible.length === 1) return
                          setLook({ ...look, hidden: look.hidden.includes(c.key) ? look.hidden.filter((h) => h !== c.key) : [...look.hidden, c.key] })
                        }}
                      >
                        {c.label ?? c.key}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {!shown.length ? (
          <tr>
            <td colSpan={span} className="h-11 px-2 text-center text-sm text-muted-foreground">
              {rows.length ? word("no-matches") : (empty ?? word("no-results"))}
            </td>
          </tr>
        ) : (
          <>
            {first > 0 && <tr aria-hidden="true" style={{ height: first * rowHeight }} />}
            {paged.slice(first, last).map((r) => (
              <TableRow
                key={String(rowKey(r) ?? "")}
                data-state={isPicked(r) ? "selected" : undefined}
                className={cn(onRowClick && "cursor-pointer")}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick && ((e) => !(e.target as HTMLElement).closest("button, a, input, [role=checkbox], [role=menuitem]") && onRowClick(r))}
                onKeyDown={onRowClick && ((e) => e.key === "Enter" && e.target === e.currentTarget && onRowClick(r))}
              >
                {selectable && (
                  <TableCell className="px-2">
                    <Checkbox aria-label={word("select-row")} checked={isPicked(r)} onCheckedChange={(on) => toggle(r, !!on)} />
                  </TableCell>
                )}
                {visible.map((c) => (
                  <TableCell key={c.key} className={cn(resizable && "overflow-hidden text-ellipsis whitespace-nowrap", ALIGN[alignOf(c)], numeric(c) && "tabular-nums")}>
                    {c.cell ? c.cell(r) : written(c, valueOf(c, r))}
                  </TableCell>
                ))}
                {lastColumn && <TableCell className="p-1 text-center">{rowActions?.(r)}</TableCell>}
              </TableRow>
            ))}
            {last < paged.length && <tr aria-hidden="true" style={{ height: (paged.length - last) * rowHeight }} />}
            {paging === "infinite" && pageSize && (
              <tr ref={end} aria-hidden="true">
                <td colSpan={span} className="h-px p-0" />
              </tr>
            )}
          </>
        )}
      </TableBody>
      {footer && shown.length > 0 && (
        <TableFooter className="sticky bottom-0 z-10">
          <TableRow>
            {selectable && <TableCell />}
            {visible.map((c, i) => (
              <TableCell key={c.key} className={cn(ALIGN[alignOf(c)], "whitespace-nowrap tabular-nums", !numeric(c) && "text-muted-foreground")}>
                {/* The first column says how many; the rest sum up what they hold. */}
                {i === 0 ? (selectable ? word("selected").replace("{n}", String(pickedShown.length)) : counted(shown.length)) : sumOf(c, selectable ? pickedShown : shown)}
              </TableCell>
            ))}
            {lastColumn && <TableCell />}
          </TableRow>
        </TableFooter>
      )}
    </table>
  )

  const filterOf = (c: SmartColumn<Row>) => {
    const name = labelText(c)
    if (numeric(c)) {
      const bound = (values: Record<string, string>, set: (v: Record<string, string>) => void, said: string) => (
        <Input type="number" className="min-w-0 flex-1" value={values[c.key] ?? ""} onChange={(e) => set({ ...values, [c.key]: e.target.value })} aria-label={`${name} ${said}`} placeholder={said} />
      )
      return (
        <div key={c.key} className="grid gap-1.5 text-sm">
          <span className="font-medium">{name}</span>
          <div className="flex items-center gap-1.5">
            {bound(low, setLow, word("min"))}
            <span className="text-muted-foreground">–</span>
            {bound(high, setHigh, word("max"))}
          </div>
        </div>
      )
    }
    const options =
      c.type === "bool"
        ? [
            { value: "yes", label: word("yes") },
            { value: "no", label: word("no") },
          ]
        : [...new Set(rows.map((r) => String(valueOf(c, r) ?? "")).filter(Boolean))]
            .sort()
            .slice(0, 50)
            .map((v) => ({ value: v, label: v }))
    const items = [{ value: "", label: word("any") }, ...options]
    return (
      <div key={c.key} className="grid gap-1.5 text-sm">
        <span className="font-medium">{name}</span>
        <Select items={items} value={chosen[c.key] ?? ""} onValueChange={(v) => setChosen({ ...chosen, [c.key]: String(v ?? "") })}>
          <SelectTrigger className="w-full" aria-label={name}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent><SelectGroup>
            {items.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup></SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div data-slot="smart-table" className={cn("grid min-w-0 gap-3", className)}>
      {hasToolbar && (
        <div className="@container flex items-center gap-2">
          {start}
          {search ? (
            <Input type="search" className="max-w-72 min-w-0 flex-1" value={term} onChange={(e) => (setTerm(e.target.value), onSearch?.(e.target.value))} placeholder={word("search")} aria-label={word("search-plain")} />
          ) : (
            <span className="flex-1" />
          )}
          {filters.length > 0 && (
            <Popover>
              <PopoverTrigger render={<Button variant="outline" size="sm" className="shrink-0" aria-label={word("filters")} />}>
                <ListFilterIcon />
                <span className="hidden @md:inline">{word("filters")}</span>
                {active > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] leading-4 text-primary-foreground tabular-nums">{active}</span>}
              </PopoverTrigger>
              <PopoverContent align="end" className="grid w-72 gap-3">
                {filters.map(filterOf)}
                {active > 0 && (
                  <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => (setChosen({}), setLow({}), setHigh({}))}>
                    {word("clear")}
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
          {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div
        ref={scroller}
        className={cn("relative w-full", scrolls ? "overflow-auto" : "overflow-x-auto overflow-y-hidden")}
        style={scrolls ? { maxHeight } : undefined}
        onScroll={(e) => many && setScrolled(e.currentTarget.scrollTop)}
      >
        {resizable ? (
          <div ref={sizer} style={{ overflowX: "clip", width: `max(100%, ${total}px)` }}>
            {tableEl}
          </div>
        ) : (
          tableEl
        )}
      </div>
      {pageSize && paging === "pages" && pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {word("range")
              .replace("{from}", String((at - 1) * pageSize + 1))
              .replace("{to}", String(Math.min(at * pageSize, shown.length)))
              .replace("{of}", String(shown.length))}
          </span>
          <Pager className="mx-0 w-auto" page={at} pages={pages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

export { SmartTable, type SmartColumn, type TableLook }
