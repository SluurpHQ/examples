import * as React from "react"
import { contours } from "d3-contour"

import { type ChartConfig } from "@/components/ui/chart"
import { hue, nice, plain, seriesConfig } from "@/components/sluurp/chart-plot"
import { ChartKey, ChartSvg, textWidth, tint } from "@/components/sluurp/chart-svg"

type Shared = { colors?: string[]; formatValue?: (value: number) => string; className?: string }

const polar = (c: number, r: number, turn: number) => [c + r * Math.sin(turn * 2 * Math.PI), c - r * Math.cos(turn * 2 * Math.PI)] as const

/** A ring's slice from one turn to another, clockwise from the top; a disc's when `inner` is 0. */
export function slice(c: number, outer: number, inner: number, from: number, to: number) {
  to = Math.min(to, from + 0.9999)
  const big = to - from > 0.5 ? 1 : 0
  const [x1, y1] = polar(c, outer, from)
  const [x2, y2] = polar(c, outer, to)
  if (!inner) return `M${c} ${c}L${x1} ${y1}A${outer} ${outer} 0 ${big} 1 ${x2} ${y2}Z`
  const [x3, y3] = polar(c, inner, to)
  const [x4, y4] = polar(c, inner, from)
  return `M${x1} ${y1}A${outer} ${outer} 0 ${big} 1 ${x2} ${y2}L${x3} ${y3}A${inner} ${inner} 0 ${big} 0 ${x4} ${y4}Z`
}

/** Labels along a band axis, every so many so they do not run into each other. */
const every = (names: string[], room: number) => Math.max(1, Math.ceil((Math.max(0, ...names.map(textWidth)) + 8) / Math.max(1, room / Math.max(1, names.length))))

const lead = (colors?: string[]): ChartConfig => ({ value: { label: "Value", color: hue(colors, 0) } })

/** A value per row and column as a grid of cells, darker for more; each cell's value in it where it fits. */
function Heatmap({
  rows = [],
  columns = [],
  values = [],
  showValues = true,
  rowHeight = 32,
  colors,
  formatValue = plain,
  className,
}: Shared & { rows?: string[]; columns?: string[]; values?: (number | null)[][]; showValues?: boolean; rowHeight?: number }) {
  const flat = values.flat().filter((v): v is number => v !== null && Number.isFinite(v))
  const lo = Math.min(...flat)
  const hi = Math.max(...flat)
  const left = Math.min(140, Math.max(24, ...rows.map(textWidth)) + 12)
  return (
    <ChartSvg
      config={lead(colors)}
      className={className ?? "aspect-auto w-full"}
      height={rows.length * rowHeight + 24}
      label={rows.map((r, i) => `${r}: ${columns.map((c, j) => `${c} ${values[i]?.[j] ?? "none"}`).join(", ")}`).join("; ")}
      draw={({ width }, show) => {
        const cell = (width - left) / Math.max(1, columns.length)
        const skip = every(columns, width - left)
        return (
          <>
            {rows.map((r, i) => (
              <text key={`r${i}`} x={left - 8} y={i * rowHeight + rowHeight / 2 + 4} textAnchor="end" className="fill-muted-foreground">
                {r}
              </text>
            ))}
            {columns.map((c, j) =>
              j % skip ? null : (
                <text key={`c${j}`} x={left + cell * (j + 0.5)} y={rows.length * rowHeight + 16} textAnchor="middle" className="fill-muted-foreground">
                  {c}
                </text>
              ),
            )}
            {values.map((row, i) =>
              row.map((v, j) => {
                if (v === null || !Number.isFinite(v)) return null
                const share = hi > lo ? (v - lo) / (hi - lo) : 1
                const x = left + cell * j + 1
                const y = i * rowHeight + 1
                const fill = tint("var(--color-value)", share)
                return (
                  <g key={`${i}-${j}`} onPointerEnter={() => show({ title: `${rows[i]} · ${columns[j]}`, rows: [{ label: "Value", value: formatValue(v), colour: fill }], x: x + cell / 2, y: y + rowHeight / 2 })}>
                    <rect x={x} y={y} width={Math.max(0, cell - 2)} height={rowHeight - 2} rx={4} fill={fill} />
                    {showValues && cell >= textWidth(formatValue(v)) + 8 && (
                      <text x={x + cell / 2 - 1} y={y + rowHeight / 2 + 3} textAnchor="middle" className="pointer-events-none tabular-nums" fill={share > 0.55 ? "var(--background)" : "var(--foreground)"}>
                        {formatValue(v)}
                      </text>
                    )}
                  </g>
                )
              }),
            )}
          </>
        )
      }}
    />
  )
}

/** Smoothed three times: a box blur, twice across and down, to soften a coarse grid's contours. */
function blur(data: number[], width: number, height: number, r: number) {
  const pass = (at: (i: number, k: number) => number, lines: number, length: number) => {
    const line = new Float64Array(length)
    for (let i = 0; i < lines; i++) {
      for (let k = 0; k < length; k++) line[k] = data[at(i, k)]!
      let sum = 0
      for (let k = -r; k <= r; k++) sum += line[Math.max(0, Math.min(length - 1, k))]!
      for (let k = 0; k < length; k++) {
        data[at(i, k)] = sum / (2 * r + 1)
        sum += line[Math.min(length - 1, k + r + 1)]! - line[Math.max(0, k - r)]!
      }
    }
  }
  for (let n = 0; n < 2; n++) {
    pass((i, k) => i * width + k, height, width)
    pass((i, k) => k * width + i, width, height)
  }
}

/** A grid of values as smooth bands of equal value, darker for more, as a map shows heights. */
function Contour({ z = [], x, y, levels = 8, colors, formatValue = plain, className }: Shared & { z?: (number | null)[][]; x?: (string | number)[]; y?: (string | number)[]; levels?: number }) {
  const rows = z.length
  const cols = Math.max(0, ...z.map((r) => r.length))
  const known = z.flat().filter((v): v is number => v !== null && Number.isFinite(v))
  const lo = Math.min(...known)
  const hi = Math.max(...known)
  // A finer grid by bilinear steps (and a blur), so the bands come out round, not stepped.
  const f = Math.max(1, Math.min(10, Math.ceil(96 / Math.max(1, cols, rows))))
  const bands = React.useMemo(() => {
    const at = (i: number, j: number) => z[Math.max(0, Math.min(rows - 1, i))]?.[Math.max(0, Math.min(cols - 1, j))] ?? NaN
    const fine = Array.from({ length: rows * f * cols * f }, (_, n) => {
      const u = ((n % (cols * f)) + 0.5) / f - 0.5
      const v = (Math.floor(n / (cols * f)) + 0.5) / f - 0.5
      const j = Math.max(0, Math.min(cols - 1, u))
      const i = Math.max(0, Math.min(rows - 1, v))
      const j0 = Math.floor(j)
      const i0 = Math.floor(i)
      const top = at(i0, j0) * (1 - (j - j0)) + at(i0, j0 + 1) * (j - j0)
      const under = at(i0 + 1, j0) * (1 - (j - j0)) + at(i0 + 1, j0 + 1) * (j - j0)
      return top * (1 - (i - i0)) + under * (i - i0)
    })
    if (f > 1 && fine.every(Number.isFinite)) blur(fine, cols * f, rows * f, Math.max(1, Math.round(f * 0.6)))
    return contours()
      .size([cols * f, rows * f])
      .thresholds(Array.from({ length: levels }, (_, k) => lo + ((hi - lo) * k) / levels))(fine)
  }, [z, levels])
  const left = y ? Math.min(100, Math.max(24, ...y.map((v) => textWidth(String(v)))) + 12) : 8
  return (
    <ChartSvg
      config={lead(colors)}
      className={className ?? "aspect-auto h-72 w-full"}
      label={`A contour of ${rows} by ${cols} values, from ${formatValue(lo)} to ${formatValue(hi)}`}
      draw={({ width, height }, show) => {
        const bottom = x ? 24 : 4
        const plotW = width - left - 8
        const plotH = height - bottom - 4
        const px = (cx: number) => left + (cx / cols) * plotW
        const py = (cy: number) => 4 + (cy / rows) * plotH
        // Each ring as a smooth closed curve through its points (a Catmull-Rom spline as Béziers).
        const ring = (r: number[][]) => {
          const pts: number[][] = []
          for (const [a, b] of r.slice(0, -1)) {
            const q = [px(a! / f), py(b! / f)]
            const last = pts[pts.length - 1]
            if (!last || Math.hypot(q[0]! - last[0]!, q[1]! - last[1]!) >= 5) pts.push(q)
          }
          const n = pts.length
          if (n < 3) return ""
          const q = (i: number) => pts[(i + n) % n]!
          let d = `M${q(0)[0]!.toFixed(1)},${q(0)[1]!.toFixed(1)}`
          for (let i = 0; i < n; i++) {
            const [p0, p1, p2, p3] = [q(i - 1), q(i), q(i + 1), q(i + 2)] as [[number, number], [number, number], [number, number], [number, number]]
            d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
          }
          return `${d}Z`
        }
        const xs = x?.map(String) ?? []
        const ys = y?.map(String) ?? []
        return (
          <>
            <rect x={left} y={4} width={plotW} height={plotH} rx={6} fill={tint("var(--color-value)", 0)} />
            {bands.map((b, k) => (
              <path
                key={k}
                d={b.coordinates.map((poly) => poly.map(ring).join("")).join("")}
                fill={tint("var(--color-value)", (k + 1) / levels)}
                fillRule="evenodd"
                stroke="var(--background)"
                strokeOpacity={0.5}
              />
            ))}
            {xs.map((v, j) =>
              j % every(xs, plotW) ? null : (
                <text key={`x${j}`} x={px(j + 0.5)} y={height - 8} textAnchor="middle" className="fill-muted-foreground">
                  {v}
                </text>
              ),
            )}
            {ys.map((v, i) =>
              i % Math.max(1, Math.ceil(24 / Math.max(1, plotH / rows))) ? null : (
                <text key={`y${i}`} x={left - 8} y={py(i + 0.5) + 4} textAnchor="end" className="fill-muted-foreground">
                  {v}
                </text>
              ),
            )}
            <rect
              x={left}
              y={4}
              width={plotW}
              height={plotH}
              fill="transparent"
              onPointerMove={(e) => {
                const box = e.currentTarget.getBoundingClientRect()
                const j = Math.min(cols - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * cols)))
                const i = Math.min(rows - 1, Math.max(0, Math.floor(((e.clientY - box.top) / box.height) * rows)))
                const v = z[i]?.[j]
                show(
                  v === null || v === undefined
                    ? null
                    : {
                        title: [y?.[i], x?.[j]].filter((n) => n !== undefined).join(" · ") || undefined,
                        rows: [{ label: "Value", value: formatValue(v), colour: tint("var(--color-value)", hi > lo ? (v - lo) / (hi - lo) : 1) }],
                        x: px(j + 0.5),
                        y: py(i + 0.5),
                      },
                )
              }}
            />
          </>
        )
      }}
    />
  )
}

/** Every pair of up to five measures, a scatter each, the same row lit across them all as it is pointed at. */
function Splom({ dimensions = [], labels, groups, colors, formatValue = plain, className }: Shared & { dimensions?: { name: string; values: number[] }[]; labels?: string[]; groups?: string[] }) {
  const dims = dimensions.slice(0, 5)
  const n = dims.length
  const kinds = [...new Set(groups ?? [""])]
  const config = seriesConfig(kinds, colors)
  const colourOf = (row: number) => `var(--color-s${groups ? kinds.indexOf(groups[row]!) : 0})`
  const scales = dims.map((d) => nice(Math.min(...d.values), Math.max(...d.values), 3))
  const count = dims[0]?.values.length ?? 0
  const [lit, setLit] = React.useState<number | null>(null)
  const left = 56
  const bottom = 44
  const top = 8
  const gap = 6
  return (
    <ChartSvg
      config={config}
      className={className ?? "aspect-square w-full max-w-[620px]"}
      label={`Every pair of ${dims.map((d) => d.name).join(", ")}, for ${count} rows`}
      legend={<ChartKey items={kinds.filter(Boolean).map((name, i) => ({ name, colour: `var(--color-s${i})` }))} />}
      draw={({ width, height }, show) => {
        const m = Math.min(width - left - 8, height - top - bottom)
        const cell = (m - gap * (n - 1)) / Math.max(1, n)
        const x0 = (width - (left + m)) / 2 + left
        const X = (c: number) => x0 + c * (cell + gap)
        const Y = (r: number) => top + r * (cell + gap)
        const inset = 5
        const along = (k: number, v: number) => inset + ((v - scales[k]!.bottom) / (scales[k]!.top - scales[k]!.bottom || 1)) * (cell - 2 * inset)
        const out: React.ReactNode[] = []
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            if (r === c) continue
            out.push(<rect key={`b${r}-${c}`} x={X(c)} y={Y(r)} width={cell} height={cell} rx={4} fill="color-mix(in oklab, var(--muted) 45%, transparent)" />)
            for (let i = 0; i < count; i++) {
              const cx = X(c) + along(c, dims[c]!.values[i]!)
              const cy = Y(r) + cell - along(r, dims[r]!.values[i]!)
              out.push(
                <circle
                  key={`p${r}-${c}-${i}`}
                  cx={cx}
                  cy={cy}
                  r={lit === i ? 4.5 : 3}
                  fill={colourOf(i)}
                  stroke="var(--background)"
                  fillOpacity={lit === null || lit === i ? 0.9 : 0.2}
                  onPointerEnter={() => {
                    setLit(i)
                    show({ title: labels?.[i], rows: dims.map((d) => ({ label: d.name, value: formatValue(d.values[i]!), colour: colourOf(i) })), x: cx, y: cy })
                  }}
                />,
              )
            }
          }
          for (const v of scales[r]!.ticks)
            out.push(
              <text key={`yt${r}-${v}`} x={x0 - 6} y={Y(r) + cell - along(r, v)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {formatValue(v)}
              </text>,
            )
          out.push(
            <text key={`yn${r}`} transform={`translate(${x0 - left + 10} ${Y(r) + cell / 2}) rotate(-90)`} textAnchor="middle" className="fill-foreground font-medium">
              {dims[r]!.name}
            </text>,
          )
        }
        const base = top + n * (cell + gap) - gap
        for (let c = 0; c < n; c++) {
          for (const v of scales[c]!.ticks)
            out.push(
              <text key={`xt${c}-${v}`} x={X(c) + along(c, v)} y={base + 14} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                {formatValue(v)}
              </text>,
            )
          out.push(
            <text key={`xn${c}`} x={X(c) + cell / 2} y={base + 34} textAnchor="middle" className="fill-foreground font-medium">
              {dims[c]!.name}
            </text>,
          )
        }
        return <g onPointerLeave={() => setLit(null)}>{out}</g>
      }}
    />
  )
}

/** Points by three parts of a whole, in a triangle whose corners are each part alone. */
function Ternary({ axes = ["A", "B", "C"], data = [], colors, className }: Shared & { axes?: [string, string, string]; data?: { name?: string; a: number; b: number; c: number; group?: string }[] }) {
  const kinds = [...new Set(data.map((d) => d.group ?? ""))]
  return (
    <ChartSvg
      config={seriesConfig(kinds, colors)}
      className={className ?? "aspect-[1.08] w-full max-w-80"}
      label={data.map((d) => `${d.name ?? ""} ${axes[0]} ${d.a}, ${axes[1]} ${d.b}, ${axes[2]} ${d.c}`).join("; ")}
      legend={<ChartKey items={kinds.filter(Boolean).map((name, i) => ({ name, colour: `var(--color-s${i})` }))} />}
      draw={({ width }, show) => {
        const side = width - 48
        const h = (side * Math.sqrt(3)) / 2
        const ox = 24
        const oy = 20
        const top = [ox + side / 2, oy]
        const left = [ox, oy + h]
        const right = [ox + side, oy + h]
        const point = (a: number, b: number, c: number) => {
          const t = a + b + c || 1
          return [(a * top[0]! + b * left[0]! + c * right[0]!) / t, (a * top[1]! + b * left[1]! + c * right[1]!) / t] as const
        }
        const grid = [0.2, 0.4, 0.6, 0.8].flatMap((f) => [
          [point(f, 1 - f, 0), point(f, 0, 1 - f)],
          [point(1 - f, f, 0), point(0, f, 1 - f)],
          [point(1 - f, 0, f), point(0, 1 - f, f)],
        ])
        return (
          <>
            <polygon points={[top, left, right].map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--border)" />
            {grid.map(([p, q], i) => (
              <line key={i} x1={p![0]} y1={p![1]} x2={q![0]} y2={q![1]} stroke="var(--border)" strokeOpacity={0.5} />
            ))}
            <text x={top[0]} y={top[1]! - 8} textAnchor="middle" className="fill-muted-foreground font-medium">
              {axes[0]}
            </text>
            <text x={left[0]} y={left[1]! + 16} className="fill-muted-foreground font-medium">
              {axes[1]}
            </text>
            <text x={right[0]} y={right[1]! + 16} textAnchor="end" className="fill-muted-foreground font-medium">
              {axes[2]}
            </text>
            {data.map((d, i) => {
              const [x, y] = point(d.a, d.b, d.c)
              const t = d.a + d.b + d.c || 1
              const colour = `var(--color-s${kinds.indexOf(d.group ?? "")})`
              const share = (v: number) => `${Math.round((v / t) * 100)}%`
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={5}
                  fill={colour}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                  onPointerEnter={() =>
                    show({ title: d.name, rows: [{ label: axes[0], value: share(d.a), colour }, { label: axes[1], value: share(d.b), colour }, { label: axes[2], value: share(d.c), colour }], x, y })
                  }
                />
              )
            })}
          </>
        )
      }}
    />
  )
}

/** Each row a line across the measures side by side, coloured by the first; the one pointed at lit. */
function Parallel({ dimensions = [], labels, colors, formatValue = plain, className }: Shared & { dimensions?: { name: string; values: number[] }[]; labels?: string[] }) {
  const count = dimensions[0]?.values.length ?? 0
  const scales = dimensions.map((d) => nice(Math.min(...d.values), Math.max(...d.values), 4))
  const first = dimensions[0]?.values ?? []
  const lo = Math.min(...first)
  const hi = Math.max(...first)
  const [lit, setLit] = React.useState<number | null>(null)
  return (
    <ChartSvg
      config={lead(colors)}
      className={className ?? "aspect-auto h-72 w-full"}
      label={`${count} rows through ${dimensions.map((d) => d.name).join(", ")}`}
      draw={({ width, height }, show) => {
        const top = 24
        const bottom = height - 12
        const left = 40
        const right = width - 40
        const x = (k: number) => left + ((right - left) * k) / Math.max(1, dimensions.length - 1)
        const y = (k: number, v: number) => bottom - ((v - scales[k]!.bottom) / (scales[k]!.top - scales[k]!.bottom || 1)) * (bottom - top)
        const colour = (i: number) => tint("var(--color-value)", hi > lo ? 0.25 + (0.75 * (first[i]! - lo)) / (hi - lo) : 1)
        return (
          <>
            {dimensions.map((d, k) => (
              <g key={d.name}>
                <line x1={x(k)} x2={x(k)} y1={top} y2={bottom} stroke="var(--border)" />
                <text x={x(k)} y={top - 10} textAnchor="middle" className="fill-foreground font-medium">
                  {d.name}
                </text>
                {scales[k]!.ticks.map((v) => (
                  <text key={v} x={x(k) - 5} y={y(k, v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">
                    {formatValue(v)}
                  </text>
                ))}
              </g>
            ))}
            <g onPointerLeave={() => setLit(null)}>
              {Array.from({ length: count }, (_, i) => (
                <polyline
                  key={i}
                  points={dimensions.map((d, k) => `${x(k)},${y(k, d.values[i]!)}`).join(" ")}
                  fill="none"
                  stroke={colour(i)}
                  strokeLinejoin="round"
                  strokeWidth={lit === i ? 3 : 1.5}
                  strokeOpacity={lit === null || lit === i ? 0.9 : 0.15}
                  className="transition-[stroke-opacity]"
                  onPointerEnter={(e) => {
                    setLit(i)
                    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                    show({ title: labels?.[i], rows: dimensions.map((d) => ({ label: d.name, value: formatValue(d.values[i]!), colour: colour(i) })), x: e.clientX - box.left, y: e.clientY - box.top })
                  }}
                />
              ))}
            </g>
          </>
        )
      }}
    />
  )
}

/** Bars round a circle, a band a label, the series stacked outwards; areas, not radii, are to scale. */
function PolarBars({ labels = [], series = [], colors, formatValue = plain, className }: Shared & { labels?: string[]; series?: { name: string; values: number[] }[] }) {
  const totals = labels.map((_, i) => series.reduce((s, x) => s + Math.max(0, x.values[i] ?? 0), 0))
  const top = nice(0, Math.max(1, ...totals), 4).top
  return (
    <ChartSvg
      config={seriesConfig(series.map((s) => s.name), colors)}
      className={className ?? "mx-auto aspect-square w-full max-w-80"}
      label={labels.map((l, i) => `${l} ${formatValue(totals[i]!)}`).join(", ")}
      legend={<ChartKey items={series.map((s, i) => ({ name: s.name, colour: `var(--color-s${i})` }))} />}
      draw={({ width }, show) => {
        const c = width / 2
        const r = c - 24
        const k = 1 / Math.max(1, labels.length)
        const radius = (v: number) => Math.sqrt(v / top) * r
        const out: React.ReactNode[] = [0.25, 0.5, 0.75, 1].map((f) => <circle key={`g${f}`} cx={c} cy={c} r={Math.sqrt(f) * r} fill="none" stroke="var(--border)" strokeOpacity={0.5} />)
        labels.forEach((l, i) => {
          let run = 0
          const tip = () => ({ title: l, rows: series.map((s, m) => ({ label: s.name, value: formatValue(s.values[i] ?? 0), colour: `var(--color-s${m})` })) })
          series.forEach((s, j) => {
            const v = Math.max(0, s.values[i] ?? 0)
            const [tx, ty] = polar(c, radius(run + v), (i + 0.5) * k)
            out.push(<path key={`${i}-${j}`} d={slice(c, radius(run + v), radius(run), (i + 0.06) * k, (i + 0.94) * k)} fill={`var(--color-s${j})`} stroke="var(--background)" onPointerEnter={() => show({ ...tip(), x: tx, y: ty })} />)
            run += v
          })
          const [lx, ly] = polar(c, r + 12, (i + 0.5) * k)
          out.push(
            <text key={`l${i}`} x={lx} y={ly} textAnchor={Math.abs(lx - c) < 4 ? "middle" : lx > c ? "start" : "end"} dominantBaseline="middle" className="fill-muted-foreground">
              {l}
            </text>,
          )
        })
        return out
      }}
    />
  )
}

export { Heatmap, Contour, Splom, Ternary, Parallel, PolarBars }
