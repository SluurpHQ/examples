import * as React from "react"
import { cn } from "cn"

import { ChartStyle, type ChartConfig } from "@/components/ui/chart"

/** One line of a tooltip: its colour, what it is, its value. */
type TipRow = { label: React.ReactNode; value: React.ReactNode; colour?: string; active?: boolean }

/** What a tooltip says, and where on the chart it points. */
type Tip = { title?: React.ReactNode; rows: TipRow[]; x: number; y: number }

/** A tooltip as shadcn's chart tooltip looks: a title, then a row a value, each with its colour's mark. */
function ChartTip({ title, rows, className, style }: { title?: React.ReactNode; rows: TipRow[]; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      role="tooltip"
      className={cn("pointer-events-none grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", className)}
      style={style}
    >
      {title && <div className="font-medium">{title}</div>}
      <div className="grid gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className={cn("flex w-full items-center gap-2", row.active === false && "opacity-60")}>
            {row.colour && <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: row.colour }} />}
            <div className="flex flex-1 items-center justify-between gap-4 leading-none">
              <span className={cn("text-muted-foreground", row.active && "font-medium text-foreground")}>{row.label}</span>
              <span className="font-mono font-medium text-foreground tabular-nums">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type Draw = (size: { width: number; height: number }, show: (tip: Tip | null) => void) => React.ReactNode

/**
 * A chart drawn as SVG of its own, for the kinds Recharts has no shape for (a heatmap, a contour, a map), in
 * shadcn's chart frame: the same `data-slot="chart"` box, colours from `config` (`var(--color-key)`), and tooltip
 * as every other chart. `draw` makes the SVG for the box's size, again as it changes; a mark calls `show` as it is
 * pointed at.
 */
function ChartSvg({ config = {}, draw, label, className, height, legend }: { config?: ChartConfig; draw: Draw; label: string; className?: string; /** A height of its own, for a chart as tall as its rows. */ height?: number; legend?: React.ReactNode }) {
  const [tip, setTip] = React.useState<Tip | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const box = React.useRef<HTMLDivElement>(null)
  const id = `chart-${React.useId().replace(/:/g, "")}`
  React.useEffect(() => {
    const resized = new ResizeObserver(([e]) => setSize({ width: Math.round(e!.contentRect.width), height: Math.round(e!.contentRect.height) }))
    resized.observe(box.current!)
    return () => resized.disconnect()
  }, [])
  return (
    <div className="grid gap-3">
      <div className="relative" onPointerLeave={() => setTip(null)}>
        <div ref={box} data-slot="chart" data-chart={id} className={cn("flex aspect-video justify-center text-xs", className)} style={height ? { height } : undefined}>
          <ChartStyle id={id} config={config} />
          {size.width > 0 && size.height > 0 && (
            <svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={label} className="overflow-visible">
              {draw(size, setTip)}
            </svg>
          )}
        </div>
        {tip && (
          <ChartTip
            title={tip.title}
            rows={tip.rows}
            className="absolute z-10"
            // Beside what it points at, on the side with room.
            style={{ top: tip.y, left: tip.x, transform: `translate(${tip.x > size.width / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
          />
        )}
      </div>
      {legend}
    </div>
  )
}

/** A legend as shadcn's: each name with its colour's mark. */
function ChartKey({ items }: { items: { name: React.ReactNode; colour: string }[] }) {
  if (items.length < 2) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: item.colour }} />
          {item.name}
        </div>
      ))}
    </div>
  )
}

/** `colour` washed toward the background by how much is `share` (0 to 1): a scale in one hue. */
export const tint = (colour: string, share: number) => `color-mix(in oklab, ${colour} ${Math.round(12 + share * 88)}%, var(--background))`

// The width of a short label, measured, for laying out axes and fitting words in marks.
let pen: CanvasRenderingContext2D | null | undefined
export const textWidth = (t: string) => {
  if (pen === undefined) {
    pen = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")
    if (pen) pen.font = `12px ${getComputedStyle(document.body).fontFamily}`
  }
  return pen?.measureText(t).width ?? t.length * 6.5
}

export { ChartSvg, ChartTip, ChartKey, type Tip, type TipRow }
