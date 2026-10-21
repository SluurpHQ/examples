import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart as PieRoot,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RadarRoot,
  RadialBar,
  RadialBarChart,
  Scatter as Dots,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { hue, plain } from "@/components/sluurp/chart-plot"

/** A key safe in a CSS variable's name: `var(--color-<key>)`. */
const keyOf = (i: number) => `s${i}`

/**
 * Bars, a line, an area or dots over the rows' `x`, a series for each key of `config`. Stacked, the bars of a row
 * stand on one another. `bandColors` gives each bar of a single series a colour of its own, in turn.
 */
function Chart({
  type = "bar",
  data = [],
  x = "label",
  config = {},
  stacked = false,
  bandColors,
  height = 200,
  legend,
  formatValue = plain,
  className,
}: {
  type?: "bar" | "line" | "area" | "dot"
  data?: Record<string, unknown>[]
  x?: string
  config?: Record<string, { label?: string; color?: string }>
  stacked?: boolean
  bandColors?: string[]
  height?: number
  legend?: boolean
  formatValue?: (value: number) => string
  className?: string
}) {
  const series = Object.keys(config)
  const chartConfig: ChartConfig = Object.fromEntries(series.map((s, i) => [keyOf(i), { label: config[s]!.label || s, color: config[s]!.color ?? hue(undefined, i) }]))
  // The rows with each series under its safe key.
  const rows = data.map((d) => ({ [x]: d[x], ...Object.fromEntries(series.map((s, i) => [keyOf(i), d[s]])) }))
  const showLegend = legend ?? series.length > 1
  const axes = [
    <CartesianGrid key="grid" vertical={false} />,
    <XAxis key="x" dataKey={x} tickLine={false} axisLine={false} tickMargin={8} minTickGap={8} />,
    <YAxis key="y" tickLine={false} axisLine={false} width={44} tickFormatter={formatValue} />,
    <ChartTooltip key="tip" content={<ChartTooltipContent />} />,
    ...(showLegend ? [<ChartLegend key="legend" content={<ChartLegendContent />} />] : []),
  ]
  const fill = (i: number) => `var(--color-${keyOf(i)})`
  return (
    <ChartContainer config={chartConfig} className={cn("aspect-auto w-full", className)} style={{ height }}>
      {type === "line" ? (
        <LineChart data={rows}>
          {axes}
          {series.map((_, i) => <Line key={i} dataKey={keyOf(i)} type="natural" stroke={fill(i)} strokeWidth={2} dot={false} />)}
        </LineChart>
      ) : type === "area" ? (
        <AreaChart data={rows}>
          {axes}
          {series.map((_, i) => <Area key={i} dataKey={keyOf(i)} type="natural" stroke={fill(i)} fill={fill(i)} fillOpacity={0.3} stackId={stacked ? "a" : undefined} />)}
        </AreaChart>
      ) : type === "dot" ? (
        <LineChart data={rows}>
          {axes}
          {series.map((_, i) => <Line key={i} dataKey={keyOf(i)} stroke="none" dot={{ r: 4, fill: fill(i), stroke: "none" }} />)}
        </LineChart>
      ) : (
        <BarChart data={rows}>
          {axes}
          {series.map((_, i) => (
            <Bar key={i} dataKey={keyOf(i)} fill={fill(i)} radius={stacked ? 0 : 4} stackId={stacked ? "a" : undefined}>
              {bandColors?.length && series.length === 1 ? rows.map((_, j) => <Cell key={j} fill={bandColors[j % bandColors.length]} />) : null}
            </Bar>
          ))}
        </BarChart>
      )}
    </ChartContainer>
  )
}

/** Points by `x` and `y`, coloured by their group; their size by `size` when given. */
function Scatter({
  data = [],
  colors = {},
  xLabel,
  yLabel,
  height = 200,
  formatValue = plain,
  className,
}: {
  data?: { x: number; y: number; label?: string; group?: string; size?: number }[]
  colors?: Record<string, string>
  xLabel?: string
  yLabel?: string
  height?: number
  formatValue?: (value: number) => string
  className?: string
}) {
  const groups = [...new Set(data.map((d) => d.group ?? ""))]
  const config: ChartConfig = Object.fromEntries(groups.map((g, i) => [keyOf(i), { label: g, color: colors[g] ?? hue(undefined, i) }]))
  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", className)} style={{ height }}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name={xLabel} tickLine={false} axisLine={false} tickFormatter={formatValue} label={xLabel ? { value: xLabel, position: "insideBottom", offset: -4 } : undefined} />
        <YAxis type="number" dataKey="y" name={yLabel} tickLine={false} axisLine={false} width={44} tickFormatter={formatValue} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined} />
        <ZAxis type="number" dataKey="size" range={[40, 400]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {groups.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {groups.map((g, i) => <Dots key={g} name={g} data={data.filter((d) => (d.group ?? "") === g)} fill={`var(--color-${keyOf(i)})`} />)}
      </ScatterChart>
    </ChartContainer>
  )
}

type Part = { name: string; value: number; color?: string }

/** Parts of a whole, as slices; a ring with `donut`. */
function PieChart({ data = [], donut = false, size = 200, legend = true, className }: { data?: Part[]; donut?: boolean; size?: number; legend?: boolean; className?: string }) {
  const config: ChartConfig = Object.fromEntries(data.map((p, i) => [keyOf(i), { label: p.name, color: p.color ?? hue(undefined, i) }]))
  const rows = data.map((p, i) => ({ part: keyOf(i), value: p.value, fill: `var(--color-${keyOf(i)})` }))
  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-square", className)} style={{ height: size + (legend ? 40 : 0) }}>
      <PieRoot>
        <ChartTooltip content={<ChartTooltipContent nameKey="part" hideLabel />} />
        <Pie data={rows} dataKey="value" nameKey="part" innerRadius={donut ? "55%" : 0} strokeWidth={2} />
        {legend && <ChartLegend content={<ChartLegendContent nameKey="part" />} />}
      </PieRoot>
    </ChartContainer>
  )
}

/** Series around axes, as a web. */
function RadarChart({ axes = [], series = [], size = 240, className }: { axes?: string[]; series?: { name: string; values: number[]; color?: string }[]; size?: number; className?: string }) {
  const config: ChartConfig = Object.fromEntries(series.map((s, i) => [keyOf(i), { label: s.name, color: s.color ?? hue(undefined, i) }]))
  const rows = axes.map((axis, j) => ({ axis, ...Object.fromEntries(series.map((s, i) => [keyOf(i), s.values[j] ?? 0])) }))
  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-square", className)} style={{ height: size }}>
      <RadarRoot data={rows}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="axis" />
        {series.map((_, i) => <Radar key={i} dataKey={keyOf(i)} stroke={`var(--color-${keyOf(i)})`} fill={`var(--color-${keyOf(i)})`} fillOpacity={0.3} />)}
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
      </RadarRoot>
    </ChartContainer>
  )
}

/** A value along an arc out of `max`, as a gauge: `sweep` the share of the circle it spans, `center` written inside. */
function RadialChart({ data = [], max = 100, sweep = 1, center, size = 200, className }: { data?: Part[]; max?: number; sweep?: number; center?: React.ReactNode; legend?: boolean; size?: number; className?: string }) {
  const config: ChartConfig = Object.fromEntries(data.map((p, i) => [keyOf(i), { label: p.name, color: p.color ?? hue(undefined, i) }]))
  const rows = data.map((p, i) => ({ part: keyOf(i), value: p.value, fill: `var(--color-${keyOf(i)})` }))
  const start = 90 + (sweep * 360) / 2
  return (
    <ChartContainer config={config} className={cn("relative mx-auto aspect-square", className)} style={{ height: size }}>
      <RadialBarChart data={rows} startAngle={start} endAngle={start - sweep * 360} innerRadius="70%" outerRadius="100%">
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
        <RadialBar dataKey="value" background cornerRadius={8} />
      </RadialBarChart>
      {center !== undefined && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums">{center}</span>}
    </ChartContainer>
  )
}

export { Chart, Scatter, PieChart, RadarChart, RadialChart }
