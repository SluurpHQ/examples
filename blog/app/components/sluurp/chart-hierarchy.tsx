import * as React from "react"
import { Funnel as FunnelShape, FunnelChart, LabelList, Sankey as SankeyChart, SunburstChart, Treemap as TreemapChart } from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { hue, plain } from "@/components/sluurp/chart-plot"
import { ChartSvg, textWidth, tint } from "@/components/sluurp/chart-svg"

type Node = { name: string; value?: number; children?: Node[]; color?: string }

type Shared = { colors?: string[]; formatValue?: (value: number) => string; className?: string }

const sizeOf = (n: Node): number => (n.children?.length ? n.children.reduce((s, c) => s + sizeOf(c), 0) : Math.max(0, n.value ?? 0))
const depthOf = (ns: Node[]): number => Math.max(0, ...ns.map((n) => 1 + depthOf(n.children ?? [])))

/** Each top-level part its colour (`var(--color-sN)`), each part under it a lighter wash of that. */
function coloured(nodes: Node[], colors: string[] | undefined) {
  const config: ChartConfig = {}
  const paint = (ns: Node[], colourOf: (i: number) => string, path: string[]): any[] =>
    ns.map((n, i) => {
      const fill = n.color ?? colourOf(i)
      const at = [...path, n.name]
      return { name: n.name, path: at.join(" › "), value: sizeOf(n), fill, children: n.children?.length ? paint(n.children, (j) => tint(fill, 0.75 - j * 0.08), at) : undefined }
    })
  nodes.forEach((n, i) => (config[`s${i}`] = { label: n.name, color: n.color ?? hue(colors, i) }))
  return { config, data: paint(nodes, (i) => `var(--color-s${i})`, []) }
}

/** Parts as rectangles sized by their value, the parts of each inside it; `icicle`, side by side in columns, a level a column. */
function Treemap({ data = [], icicle = false, colors, formatValue = plain, className }: Shared & { data?: Node[]; icicle?: boolean }) {
  const { config, data: painted } = coloured(data, colors)
  const whole = data.reduce((s, n) => s + sizeOf(n), 0) || 1
  const rows = (name: string, value: number, colour: string) => [
    { label: "Value", value: formatValue(value), colour },
    { label: "Share", value: `${Math.round((value / whole) * 1000) / 10}%` },
  ]
  if (icicle) {
    return (
      <ChartSvg
        config={config}
        className={cn("aspect-auto h-72 w-full", className)}
        label={data.map((n) => `${n.name} ${formatValue(sizeOf(n))}`).join(", ")}
        draw={({ width, height }, show) => {
          const col = width / Math.max(1, depthOf(data))
          const out: React.ReactNode[] = []
          const place = (ns: any[], level: number, y0: number, span: number) => {
            const total = ns.reduce((s, n) => s + n.value, 0) || 1
            let y = y0
            for (const n of ns) {
              const h = (n.value / total) * span
              const x = level * col
              out.push(
                <g key={n.path} onPointerEnter={() => show({ title: n.path, rows: rows(n.name, n.value, n.fill), x: x + col / 2, y: y + h / 2 })}>
                  <rect x={x + 1} y={y + 1} width={Math.max(0, col - 2)} height={Math.max(0, h - 2)} rx={4} fill={n.fill} />
                  {col > textWidth(n.name) + 10 && h > 18 && (
                    <text x={x + 6} y={y + 15} className="pointer-events-none font-medium" fill={level === 0 ? "var(--background)" : "var(--foreground)"}>
                      {n.name}
                    </text>
                  )}
                </g>,
              )
              if (n.children) place(n.children, level + 1, y, h)
              y += h
            }
          }
          place(painted, 0, 0, height)
          return out
        }}
      />
    )
  }
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-72 w-full", className)}>
      <TreemapChart
        data={painted}
        dataKey="value"
        nameKey="name"
        stroke="var(--background)"
        isAnimationActive={false}
        content={(props: any) => {
          const { x, y, width, height, depth, name, fill } = props
          if (!depth || width <= 0 || height <= 0) return <g />
          return (
            <g>
              <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} rx={depth === 1 ? 4 : 3} fill={fill} />
              {width > textWidth(name) + 10 && height > 18 && (
                <text x={x + 6} y={y + 15} className="pointer-events-none font-medium" stroke="none" fill={depth === 1 ? "var(--background)" : "var(--foreground)"}>
                  {name}
                </text>
              )}
            </g>
          )
        }}
      >
        <ChartTooltip content={<ChartTooltipContent nameKey="name" labelKey="path" formatter={(v, _, item) => <TipValue colour={item.payload.fill} value={formatValue(Number(v))} share={Number(v) / whole} />} />} />
      </TreemapChart>
    </ChartContainer>
  )
}

/** A tooltip row for a part: its colour, value, and share of the whole. */
function TipValue({ colour, value, share }: { colour: string; value: string; share: number }) {
  return (
    <div className="grid w-full gap-1">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: colour }} />
        <span className="flex-1 text-muted-foreground">Value</span>
        <span className="font-mono font-medium tabular-nums">{value}</span>
      </div>
      <div className="flex items-center gap-2 pl-[18px]">
        <span className="flex-1 text-muted-foreground">Share</span>
        <span className="font-mono font-medium tabular-nums">{Math.round(share * 1000) / 10}%</span>
      </div>
    </div>
  )
}

/** Parts as rings around a centre, the parts of each in the ring outside it. */
function Sunburst({ data = [], colors, formatValue = plain, className }: Shared & { data?: Node[] }) {
  const { config, data: painted } = coloured(data, colors)
  const whole = data.reduce((s, n) => s + sizeOf(n), 0) || 1
  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-square max-h-80", className)}>
      <SunburstChart data={{ name: "", value: whole, children: painted }} dataKey="value" nameKey="name" innerRadius={40} stroke="var(--background)" textOptions={{ fill: "transparent" } as any}>
        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" formatter={(v, name, item) => <TipValue colour={item.payload?.fill} value={`${name}: ${formatValue(Number(v))}`} share={Number(v) / whole} />} />} />
      </SunburstChart>
    </ChartContainer>
  )
}

/** Flows from node to node, each band as wide as how much flows. */
function Sankey({ links = [], colors, formatValue = plain, className }: Shared & { links?: { source: string; target: string; value: number }[] }) {
  const names = [...new Set(links.flatMap((l) => [l.source, l.target]))]
  const config: ChartConfig = Object.fromEntries(names.map((n, i) => [`s${i}`, { label: n, color: hue(colors, i) }]))
  const data = {
    nodes: names.map((name, i) => ({ name, fill: `var(--color-s${i})` })),
    links: links.map((l) => ({ source: names.indexOf(l.source), target: names.indexOf(l.target), value: l.value })),
  }
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-72 w-full", className)}>
      <SankeyChart
        data={data}
        nodeWidth={10}
        nodePadding={12}
        margin={{ top: 4, right: 120, bottom: 4, left: 4 }}
        node={(props: any) => (
          <g>
            <rect x={props.x} y={props.y} width={props.width} height={props.height} rx={3} fill={props.payload.fill} />
            <text x={props.x + props.width + 6} y={props.y + props.height / 2 + 4} className="fill-foreground">
              {props.payload.name}
            </text>
          </g>
        )}
        link={(props: any) => (
          <path
            d={`M${props.sourceX},${props.sourceY}C${props.sourceControlX},${props.sourceY} ${props.targetControlX},${props.targetY} ${props.targetX},${props.targetY}`}
            fill="none"
            stroke={props.payload.source.fill}
            strokeOpacity={0.3}
            strokeWidth={Math.max(1, props.linkWidth)}
            className="transition-[stroke-opacity] hover:stroke-opacity-60"
          />
        )}
      >
        <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, name) => <span className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{name}</span><span className="font-mono font-medium tabular-nums">{formatValue(Number(v))}</span></span>} />} />
      </SankeyChart>
    </ChartContainer>
  )
}

/** Stages, largest first, each as wide as its value, with its share of the first. */
function Funnel({ data = [], colors, formatValue = plain, className }: Shared & { data?: { name: string; value: number; color?: string }[] }) {
  const first = data[0]?.value || 1
  const config: ChartConfig = Object.fromEntries(data.map((d, i) => [`s${i}`, { label: d.name, color: d.color ?? hue(colors, i) }]))
  const rows = data.map((d, i) => ({ ...d, fill: `var(--color-s${i})`, said: `${formatValue(d.value)}${i ? ` · ${Math.round((d.value / first) * 100)}%` : ""}` }))
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-72 w-full", className)}>
      <FunnelChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
        <FunnelShape data={rows} dataKey="value" nameKey="name" stroke="var(--background)" lastShapeType="rectangle" isAnimationActive={false}>
          <LabelList position="center" dataKey="said" className="fill-background font-medium" stroke="none" />
          <LabelList position="right" dataKey="name" className="fill-muted-foreground" stroke="none" />
        </FunnelShape>
      </FunnelChart>
    </ChartContainer>
  )
}

export { Treemap, Sunburst, Sankey, Funnel, type Node }
