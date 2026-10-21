import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, XAxis, YAxis } from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

/** The chart colours in order (`--chart-1`…`--chart-5`), or those given. */
export const hue = (colors: string[] | undefined, i: number) => (colors?.length ? colors[i % colors.length]! : `var(--chart-${(i % 5) + 1})`)

export const plain = (v: number) => String(Math.round(v * 100) / 100)

/** A config for named series: `s0`, `s1`… each with its name and colour, read as `var(--color-s0)`. */
export function seriesConfig(names: string[], colors?: string[]): ChartConfig {
  return Object.fromEntries(names.map((name, i) => [`s${i}`, { label: name, color: hue(colors, i) }]))
}

/** Round steps between `lo` and `hi`, about `n` of them: 0, 25, 50… */
export function nice(lo: number, hi: number, n = 4) {
  if (!(hi > lo)) hi = lo + 1
  const raw = (hi - lo) / n
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw * 0.999)!
  const bottom = Math.floor(lo / step) * step
  const top = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = bottom; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(10)))
  return { bottom, top, step, ticks }
}

type Shared = {
  /** The colours, in order; the chart colours when not given. */
  colors?: string[]
  formatValue?: (value: number) => string
  className?: string
}

const axes = (formatValue: (v: number) => string, domain?: [number, number]) => [
  <CartesianGrid key="grid" vertical={false} />,
  <XAxis key="x" dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />,
  <YAxis key="y" tickLine={false} axisLine={false} width={44} tickFormatter={formatValue} domain={domain ?? ["auto", "auto"]} />,
]

/** Values counted into bins of a round width, a bar per bin; several series side by side. */
function Histogram({ series = [], bins, colors, formatValue = plain, className }: Shared & { series?: { name: string; values: number[] }[]; bins?: number }) {
  const all = series.flatMap((s) => s.values).filter(Number.isFinite)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const want = bins ?? Math.min(30, Math.max(5, Math.ceil(Math.log2(Math.max(1, all.length)) + 1)))
  const step = all.length ? nice(lo, hi, want).step : 1
  const start = Math.floor(lo / step) * step
  const count = Math.max(1, Math.floor((hi - start) / step) + 1)
  const edge = (i: number) => formatValue(Number((start + step * i).toFixed(10)))
  const data = Array.from({ length: count }, (_, i) => ({ label: `${edge(i)} – ${edge(i + 1)}` }) as Record<string, number | string>)
  series.forEach((s, k) => {
    data.forEach((row) => (row[`s${k}`] = 0))
    for (const v of s.values) if (Number.isFinite(v)) (data[Math.min(count - 1, Math.floor((v - start) / step))]![`s${k}`] as number)++
  })
  return (
    <ChartContainer config={seriesConfig(series.map((s) => s.name), colors)} className={cn("aspect-auto h-60 w-full", className)}>
      <BarChart data={data} barCategoryGap={1}>
        {axes(String)}
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((_, k) => (
          <Bar key={k} dataKey={`s${k}`} fill={`var(--color-s${k})`} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/** Each step's change on from the last, rising and falling bars between dashed levels; a total step shows the running total. */
function Waterfall({ data = [], colors, formatValue = plain, className }: Shared & { data?: { label: string; value: number; total?: boolean }[] }) {
  let run = 0
  const steps = data.map((d) => {
    const from = d.total ? 0 : run
    const to = d.total ? run : run + d.value
    run = to
    return { label: d.label, change: d.value, total: !!d.total, to, base: Math.min(from, to), size: Math.abs(to - from), kind: d.total ? "total" : to >= from ? "up" : "down" }
  })
  const config: ChartConfig = { up: { label: "Rise", color: hue(colors, 0) }, down: { label: "Fall", color: hue(colors, 1) }, total: { label: "Total", color: hue(colors, 2) } }
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart data={steps}>
        {axes(formatValue, [Math.min(0, ...steps.map((s) => s.base)), Math.max(0, ...steps.map((s) => s.base + s.size))])}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(_, name, item) => {
                if (name !== "size") return null
                const s = item.payload as (typeof steps)[number]
                return (
                  <div className="grid w-full gap-0.5">
                    {!s.total && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Change</span>
                        <span className="font-mono font-medium tabular-nums">{(s.change > 0 ? "+" : "") + formatValue(s.change)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-mono font-medium tabular-nums">{formatValue(s.to)}</span>
                    </div>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="size" stackId="w" radius={4}>
          {steps.map((s, i) => (
            <Cell key={i} fill={`var(--color-${s.kind})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Where `v` is on the plot, from a bar shape's background (the plot's full height) and the axis's domain. */
const onPlot = (shape: { background: { y: number; height: number } }, [bottom, top]: [number, number]) => (v: number) =>
  shape.background.y + (shape.background.height * (top - v)) / Math.max(1e-9, top - bottom)

/** Prices over time: a body from open to close, a wick from low to high, rising and falling in their colours; `ohlc`, ticks for open and close. */
function Candlestick({ data = [], ohlc = false, colors, formatValue = plain, className }: Shared & { data?: { label: string; open: number; high: number; low: number; close: number }[]; ohlc?: boolean }) {
  const rows = data.map((d) => ({ ...d, kind: d.close >= d.open ? "rise" : "fall" }))
  const config: ChartConfig = { rise: { label: "Rise", color: hue(colors, 0) }, fall: { label: "Fall", color: hue(colors, 1) } }
  const scale = nice(Math.min(...data.map((d) => d.low)), Math.max(...data.map((d) => d.high)))
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <BarChart data={rows}>
        {axes(formatValue, [scale.bottom, scale.top])}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(_, __, item) => {
                const d = item.payload as (typeof rows)[number]
                return (
                  <div className="grid w-full gap-0.5">
                    {(["open", "high", "low", "close"] as const).map((k) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-muted-foreground capitalize">{k}</span>
                        <span className="font-mono font-medium tabular-nums">{formatValue(d[k])}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="high"
          isAnimationActive={false}
          shape={(props: any) => {
            const d = props.payload as (typeof rows)[number]
            const at = onPlot(props, [scale.bottom, scale.top])
            const cx = props.x + props.width / 2
            const half = Math.min(10, props.width * 0.35)
            const colour = `var(--color-${d.kind})`
            return (
              <g>
                <line x1={cx} x2={cx} y1={at(d.high)} y2={at(d.low)} stroke={colour} strokeWidth={1.5} strokeLinecap="round" />
                {ohlc ? (
                  <>
                    <line x1={cx - half} x2={cx} y1={at(d.open)} y2={at(d.open)} stroke={colour} strokeWidth={2} />
                    <line x1={cx} x2={cx + half} y1={at(d.close)} y2={at(d.close)} stroke={colour} strokeWidth={2} />
                  </>
                ) : (
                  <rect x={cx - half} y={at(Math.max(d.open, d.close))} width={half * 2} height={Math.max(1.5, Math.abs(at(d.open) - at(d.close)))} rx={2} fill={colour} />
                )}
              </g>
            )
          }}
        />
      </BarChart>
    </ChartContainer>
  )
}

function quartiles(values: number[]) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b)
  const at = (q: number) => {
    const i = (v.length - 1) * q
    const lo = Math.floor(i)
    return v[lo]! + (v[Math.min(v.length - 1, lo + 1)]! - v[lo]!) * (i - lo)
  }
  const q1 = at(0.25)
  const median = at(0.5)
  const q3 = at(0.75)
  const reach = 1.5 * (q3 - q1)
  const inside = v.filter((x) => x >= q1 - reach && x <= q3 + reach)
  return { v, q1, median, q3, low: inside[0] ?? q1, high: inside[inside.length - 1] ?? q3, out: v.filter((x) => x < q1 - reach || x > q3 + reach) }
}

/** How the values spread, a group each: box from quartile to quartile, the median across it, whiskers, the outliers as dots; `violin`, the spread's shape around a thin box. */
function BoxPlot({ groups = [], violin = false, colors, formatValue = plain, className }: Shared & { groups?: { name: string; values: number[] }[]; violin?: boolean }) {
  const rows = groups.map((g, i) => {
    const s = quartiles(g.values)
    return { label: g.name, key: `s${i}`, ...s }
  })
  const all = rows.flatMap((r) => r.v)
  const scale = nice(Math.min(...all), Math.max(...all))
  return (
    <ChartContainer config={seriesConfig(groups.map((g) => g.name), colors)} className={cn("aspect-auto h-64 w-full", className)}>
      <ComposedChart data={rows}>
        {axes(formatValue, [scale.bottom, scale.top])}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(_, name, item) => {
                if (name !== "high") return null
                const r = item.payload as (typeof rows)[number]
                const marks = [["Highest", r.high], ["Upper quartile", r.q3], ["Median", r.median], ["Lower quartile", r.q1], ["Lowest", r.low]] as const
                return (
                  <div className="grid w-full gap-0.5">
                    {marks.map(([label, v]) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-medium tabular-nums">{formatValue(v)}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
          }
        />
        <Bar
          dataKey="high"
          isAnimationActive={false}
          shape={(props: any) => {
            const r = props.payload as (typeof rows)[number]
            const at = onPlot(props, [scale.bottom, scale.top])
            const colour = `var(--color-${r.key})`
            const cx = props.x + props.width / 2
            const half = Math.min(28, props.width * 0.3) / (violin ? 3 : 1)
            let shape: React.ReactNode = null
            if (violin && r.v.length > 1) {
              const mean = r.v.reduce((a, x) => a + x, 0) / r.v.length
              const sd = Math.sqrt(r.v.reduce((a, x) => a + (x - mean) ** 2, 0) / r.v.length) || 1
              const bw = 0.9 * Math.min(sd, (r.q3 - r.q1) / 1.34 || sd) * r.v.length ** -0.2
              const from = r.v[0]!
              const to = r.v[r.v.length - 1]!
              const dens = Array.from({ length: 41 }, (_, k) => {
                const v = from + ((to - from) * k) / 40
                return [v, r.v.reduce((a, x) => a + Math.exp(-(((v - x) / bw) ** 2) / 2), 0)] as const
              })
              const peak = Math.max(...dens.map((d) => d[1]))
              const wide = Math.min(props.width * 0.45, 38)
              const clamp = (v: number) => at(Math.max(r.low, Math.min(r.high, v)))
              const side = dens.map(([v, d]) => `${cx + (d / peak) * wide},${clamp(v)}`)
              const other = [...dens].reverse().map(([v, d]) => `${cx - (d / peak) * wide},${clamp(v)}`)
              shape = <polygon points={[...side, ...other].join(" ")} fill={colour} fillOpacity={0.35} stroke={colour} strokeWidth={1.5} strokeLinejoin="round" />
            }
            return (
              <g>
                {shape}
                <line x1={cx} x2={cx} y1={at(r.high)} y2={at(r.q3)} stroke={colour} strokeWidth={1.5} />
                <line x1={cx} x2={cx} y1={at(r.q1)} y2={at(r.low)} stroke={colour} strokeWidth={1.5} />
                {!violin && (
                  <>
                    <line x1={cx - half / 2} x2={cx + half / 2} y1={at(r.high)} y2={at(r.high)} stroke={colour} strokeWidth={1.5} />
                    <line x1={cx - half / 2} x2={cx + half / 2} y1={at(r.low)} y2={at(r.low)} stroke={colour} strokeWidth={1.5} />
                  </>
                )}
                <rect
                  x={cx - half}
                  y={at(r.q3)}
                  width={half * 2}
                  height={Math.max(1, at(r.q1) - at(r.q3))}
                  rx={4}
                  fill={violin ? colour : `color-mix(in oklab, ${colour} 35%, var(--background))`}
                  stroke={colour}
                  strokeWidth={1.5}
                />
                <line x1={cx - half} x2={cx + half} y1={at(r.median)} y2={at(r.median)} stroke={violin ? "var(--background)" : colour} strokeWidth={2} />
                {!violin && r.out.map((v, i) => <circle key={i} cx={cx} cy={at(v)} r={3} fill="var(--background)" stroke={colour} strokeWidth={1.5} />)}
              </g>
            )
          }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

export { Histogram, Waterfall, Candlestick, BoxPlot }
