// A spreadsheet everybody edits at once: the registry's Spreadsheet, its cells rows of a collection, everybody's
// pointer and selection over it.
import { useEffect, useMemo, useRef, useState } from "react"
import { Sluurp } from "@sluurp/client"
import { liveCursors, type Other } from "@sluurp/client/cursors"
import { useSignal } from "@sluurp/react"
import { Spreadsheet, type SheetArea, type SheetPresence } from "@/components/sluurp/spreadsheet"
import { sheetStore } from "@/lib/sheet-store"

export function Sheet({ collection, sheet, name, resets }: { collection: string; sheet: string; name?: string; resets?: number }) {
  const sluurp = useMemo(() => new Sluurp(), [])
  const store = useMemo(() => sheetStore(collection, sheet, sluurp), [collection, sheet])
  const [ready] = useSignal(() => store.ready())
  const [others, setOthers] = useState<SheetPresence[]>([])
  // What is chosen here, for the others.
  const mine = useRef<{ area: SheetArea; holds: string[]; since: number }>({ area: { c0: 0, c1: 0, r0: 0, r1: 0 }, holds: [], since: 0 })
  const stop = useRef<() => void>(() => {})
  useEffect(() => () => stop.current(), [])

  return (
    <div>
      <Spreadsheet
        store={store}
        widthsKey={`sheet.widths.${sheet}`}
        waiting={!ready}
        others={others}
        onSelect={(area) => (mine.current.area = area)}
        onHold={(holds, since) => Object.assign(mine.current, { holds, since })}
        // A way of showing a cell, of this app's own, chosen from a cell's menu: a bar from min to max
        // (0 and 1 unless the cell says: `progress 0 100 #16a34a`).
        renderers={{
          progress: {
            options: "min max colour",
            render: (value, _ref, _sheet, [min = "0", max = "1", colour = "var(--chart-1)"]) => {
              const [lo, hi] = [Number(min) || 0, Number(max) || 1]
              const share = Math.max(0, Math.min(1, ((Number(value) || 0) - lo) / (hi - lo || 1)))
              return (
                <div className="mx-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={lo} aria-valuemax={hi} aria-valuenow={Number(value) || 0}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round(share * 1000) / 10}%`, background: colourOf(colour) }} />
                </div>
              )
            },
          },
        }}
        onTable={(table) => {
          stop.current()
          stop.current = liveCursors(`${collection}:*`, {
            over: table,
            client: sluurp,
            name,
            state: () => ({ ...mine.current.area, holds: mine.current.holds, since: mine.current.since }),
            onState: (all: Other[]) => setOthers(all.map((o) => ({ id: o.id, name: o.name, color: o.color, area: o.state as SheetArea, ...(o.state as { holds?: string[]; since?: number }) }))),
          })
        }}
      />
      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {resets ? <Countdown every={resets} /> : null}
        Formulas: a number, or
        {["=A1*2", "=SUM(A1:A3)", '=IF(A1>2, "big", "small")'].map((f) => (
          <code key={f} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{f}</code>
        ))}
      </p>
    </div>
  )
}

/**
 * A colour as a cell says it, as the sheet's looks do: a name (`emerald`, at its 500), a Tailwind class
 * (`bg-emerald-500`, `emerald-700`) as its theme colour, else any CSS colour (`#16a34a`, `var(--chart-2)`).
 */
function colourOf(said: string): string {
  const named = /^(?:bg-)?([a-z]+)(?:-(\d{2,3}))?$/.exec(said.trim())
  const css = typeof CSS !== "undefined" && CSS.supports("color", said)
  return named && !css ? `var(--color-${named[1]}-${named[2] ?? "500"})` : said
}

/** Minutes to the next reset, when the sheet is reset every few minutes (the website's copy). */
function Countdown({ every }: { every: number }) {
  const left = () => {
    const ms = every * 60_000 - (Date.now() % (every * 60_000))
    return `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`
  }
  const [shown, setShown] = useState(left)
  useEffect(() => {
    const timer = setInterval(() => setShown(left()), 1000)
    return () => clearInterval(timer)
  }, [every])
  return <span className="mr-auto w-full tabular-nums sm:w-auto">Resetting in {shown}</span>
}
