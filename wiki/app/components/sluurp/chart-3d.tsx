import * as React from "react"
import { cn } from "cn"

import { hue, nice, plain } from "@/components/sluurp/chart-plot"
import { ChartKey, ChartTip, type TipRow } from "@/components/sluurp/chart-svg"

type V3 = [number, number, number]
type M4 = Float32Array

const multiply = (a: M4, b: M4) => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let s = 0
      for (let k = 0; k < 4; k++) s += a[k * 4 + r]! * b[c * 4 + k]!
      o[c * 4 + r] = s
    }
  return o
}
const perspective = (fov: number, aspect: number, near: number, far: number) => {
  const f = 1 / Math.tan(fov / 2)
  const o = new Float32Array(16)
  o[0] = f / aspect
  o[5] = f
  o[10] = (far + near) / (near - far)
  o[11] = -1
  o[14] = (2 * far * near) / (near - far)
  return o
}
const rotateX = (t: number) => new Float32Array([1, 0, 0, 0, 0, Math.cos(t), Math.sin(t), 0, 0, -Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1])
const rotateZ = (t: number) => new Float32Array([Math.cos(t), Math.sin(t), 0, 0, -Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
const translate = (x: number, y: number, z: number) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])

/** A CSS colour (a variable, `color-mix`…) as the page resolves it, in 0–1 channels. */
function rgbOf(css: string, host: Element): V3 {
  const probe = document.createElement("span")
  probe.style.color = css
  host.append(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  if (!pen) return [0.5, 0.5, 0.5]
  pen.fillStyle = resolved
  pen.fillRect(0, 0, 1, 1)
  const [r, g, b] = pen.getImageData(0, 0, 1, 1).data
  return [r! / 255, g! / 255, b! / 255]
}

const VERTEX = `#version 300 es
in vec3 position; in vec3 normal; in vec3 colour;
uniform mat4 view; uniform float grow; uniform float size;
out vec3 tint; out float light;
void main() {
  gl_Position = view * vec4(position.xy, -1.0 + (position.z + 1.0) * grow, 1.0);
  gl_PointSize = size;
  tint = colour;
  light = length(normal) > 0.0 ? 0.78 + 0.22 * abs(dot(normalize(normal), normalize(vec3(0.4, -0.5, 0.8)))) : 1.0;
}`
const FRAGMENT = `#version 300 es
precision mediump float;
in vec3 tint; in float light;
uniform int round; uniform vec3 ring; uniform float alpha;
out vec4 colour;
void main() {
  if (round == 1) {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    colour = vec4(d > 0.36 ? ring : tint, 1.0);
    return;
  }
  colour = vec4(tint * light, alpha);
}`

type Batch = { mode: number; positions: number[]; colours: number[]; normals?: number[]; indices?: number[]; round?: boolean; size?: number; alpha?: number }
type Target = { at: V3; title?: React.ReactNode; rows: TipRow[] }
type Label = { x: number; y: number; text: string; name?: boolean }

const LINES = 1
const LINE_STRIP = 3
const TRIANGLES = 4
const POINTS = 0

/**
 * A cube to look into, turned by dragging (pinched to come closer), its axes named and numbered, its contents
 * growing up from the floor the first time it is seen; the nearest point to the pointer told in a tooltip.
 */
function Scene({
  className,
  height,
  animate,
  label,
  legend,
  axes,
  batches,
  targets,
  format,
}: {
  className?: string
  height: number
  animate: boolean
  label: string
  legend?: React.ReactNode
  /** The axes' names and the data's range, before it is fitted into the cube. */
  axes: { names: [string, string, string]; ranges: [number, number][] }
  /** What to draw in the cube from -1 to 1, its colours resolved on the page. */
  batches: (colour: (css: string) => V3) => Batch[]
  targets: Target[]
  format: (v: number) => string
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const [labels, setLabels] = React.useState<Label[]>([])
  const [tip, setTip] = React.useState<(Target & { x: number; y: number }) | null>(null)
  const [grown, setGrown] = React.useState(animate ? 0 : 1)
  // What the drawing needs between frames, kept off React's renders.
  const live = React.useRef({ turn: { yaw: -0.7, pitch: 1.05, distance: 4.4 }, view: new Float32Array(16) as M4, grow: animate ? 0 : 1, again: () => {}, project: (_: V3) => [0, 0, 0] as number[] })
  const input = React.useRef({ batches, targets, axes, format })
  input.current = { batches, targets, axes, format }
  React.useEffect(() => {
    const c = canvas.current!
    const gl = c.getContext("webgl2", { antialias: true, premultipliedAlpha: false })
    if (!gl) return
    const compile = (kind: number, source: string) => {
      const s = gl.createShader(kind)!
      gl.shaderSource(s, source)
      gl.compileShader(s)
      return s
    }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    let drawn: { vao: WebGLVertexArrayObject; count: number; batch: Batch; indexed: boolean }[] = []
    let ring: V3 = [1, 1, 1]
    let frame = 0
    let started = 0
    const upload = () => {
      const cache = new Map<string, V3>()
      const colour = (css: string) => cache.get(css) ?? (cache.set(css, rgbOf(css, c.parentElement!)), cache.get(css)!)
      ring = colour("var(--background)")
      drawn = input.current.batches(colour).map((batch) => {
        const vao = gl.createVertexArray()!
        gl.bindVertexArray(vao)
        const feed = (name: string, data: number[]) => {
          const where = gl.getAttribLocation(program, name)
          if (where < 0) return
          gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
          gl.enableVertexAttribArray(where)
          gl.vertexAttribPointer(where, 3, gl.FLOAT, false, 0, 0)
        }
        feed("position", batch.positions)
        feed("colour", batch.colours)
        feed("normal", batch.normals ?? batch.positions.map(() => 0))
        if (batch.indices) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(batch.indices), gl.STATIC_DRAW)
        }
        gl.bindVertexArray(null)
        return { vao, batch, indexed: !!batch.indices, count: batch.indices?.length ?? batch.positions.length / 3 }
      })
    }
    const state = live.current
    /** A point in the cube to where it shows on the canvas, in CSS pixels. */
    state.project = (p: V3) => {
      const m = state.view
      const z = -1 + (p[2] + 1) * state.grow
      const x = m[0]! * p[0] + m[4]! * p[1] + m[8]! * z + m[12]!
      const y = m[1]! * p[0] + m[5]! * p[1] + m[9]! * z + m[13]!
      const w = m[3]! * p[0] + m[7]! * p[1] + m[11]! * z + m[15]!
      return [((x / w + 1) / 2) * c.offsetWidth, ((1 - y / w) / 2) * c.offsetHeight, w]
    }
    const render = () => {
      frame = 0
      const dpr = Math.min(2, devicePixelRatio || 1)
      const box = c.getBoundingClientRect()
      const wide = Math.max(1, Math.round(box.width * dpr))
      const tall = Math.max(1, Math.round(box.height * dpr))
      if (c.width !== wide || c.height !== tall) (c.width = wide), (c.height = tall)
      if (started) {
        const t = Math.min(1, (performance.now() - started) / 900)
        state.grow = 1 - (1 - t) ** 3
        if (t < 1) frame = requestAnimationFrame(render)
      }
      const { yaw, pitch, distance } = state.turn
      state.view = multiply(perspective(0.62, wide / tall, 0.1, 50), multiply(translate(0, 0, -distance), multiply(rotateX(-pitch), rotateZ(yaw))))
      gl.viewport(0, 0, wide, tall)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.enable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.useProgram(program)
      const at = (n: string) => gl.getUniformLocation(program, n)
      gl.uniformMatrix4fv(at("view"), false, state.view)
      gl.uniform1f(at("grow"), state.grow)
      gl.uniform3f(at("ring"), ...ring)
      for (const d of drawn) {
        gl.uniform1i(at("round"), d.batch.round ? 1 : 0)
        gl.uniform1f(at("size"), (d.batch.size ?? 8) * dpr)
        gl.uniform1f(at("alpha"), d.batch.alpha ?? 1)
        gl.bindVertexArray(d.vao)
        if (d.indexed) gl.drawElements(d.batch.mode, d.count, gl.UNSIGNED_INT, 0)
        else gl.drawArrays(d.batch.mode, 0, d.count)
      }
      gl.bindVertexArray(null)
      // The axes' numbers and names, placed where their points fall on the canvas.
      const { axes, format } = input.current
      const out: Label[] = []
      const along = (k: number, f: number): V3 => (k === 0 ? [f, -1.12, -1] : k === 1 ? [-1.12, f, -1] : [-1.12, -1.12, f])
      axes.ranges.forEach(([lo, hi], k) => {
        for (const v of nice(lo, hi, 4).ticks) {
          if (v < lo - 1e-9 || v > hi + 1e-9) continue
          const [x, y] = state.project(along(k, hi > lo ? ((v - lo) / (hi - lo)) * 2 - 1 : 0))
          out.push({ x: x!, y: y!, text: format(v) })
        }
        const [x, y] = state.project(k === 2 ? [-1.12, -1.12, 1.25] : (along(k, 0).map((n, i) => (i === k ? 0 : n * 1.2)) as V3))
        out.push({ x: x!, y: y!, text: axes.names[k]!, name: true })
      })
      setLabels(out)
      setGrown(state.grow)
    }
    state.again = () => void (frame ||= requestAnimationFrame(render))
    upload()
    const sized = new ResizeObserver(state.again)
    sized.observe(c)
    const themed = new MutationObserver(() => (upload(), state.again()))
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })
    // It grows up from the floor the first time it is seen.
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const seen = new IntersectionObserver(([e]) => {
      if (!e!.isIntersecting) return
      seen.disconnect()
      if (animate && !reduced) started = performance.now()
      else state.grow = 1
      state.again()
    })
    seen.observe(c)
    return () => {
      sized.disconnect()
      themed.disconnect()
      seen.disconnect()
      if (frame) cancelAnimationFrame(frame)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])
  const drag = React.useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null)
  const pinch = React.useRef(new Map<number, [number, number]>())
  const spread = React.useRef(0)
  return (
    <figure data-slot="chart-3d" className={cn("relative grid w-full gap-3", className)}>
      <div
        className="relative touch-none select-none"
        style={{ height }}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          pinch.current.set(e.pointerId, [e.clientX, e.clientY])
          const t = live.current.turn
          drag.current = { x: e.clientX, y: e.clientY, yaw: t.yaw, pitch: t.pitch }
        }}
        onPointerMove={(e) => {
          const state = live.current
          if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, [e.clientX, e.clientY])
          if (pinch.current.size === 2) {
            const [a, b] = [...pinch.current.values()] as [[number, number], [number, number]]
            const d = Math.hypot(a[0] - b[0], a[1] - b[1])
            if (spread.current) state.turn = { ...state.turn, distance: Math.max(2.4, Math.min(9, state.turn.distance * (spread.current / d))) }
            spread.current = d
            return state.again()
          }
          const d = drag.current
          if (d) {
            state.turn = { ...state.turn, yaw: d.yaw + (e.clientX - d.x) * 0.008, pitch: Math.max(0.1, Math.min(1.5, d.pitch - (e.clientY - d.y) * 0.008)) }
            setTip(null)
            return state.again()
          }
          // The nearest point within 14px of the pointer.
          const box = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - box.left
          const py = e.clientY - box.top
          let best: (Target & { x: number; y: number }) | null = null
          let bestD = 14 * 14
          for (const t of input.current.targets) {
            const [x, y] = state.project(t.at) as [number, number]
            const dd = (x - px) ** 2 + (y - py) ** 2
            if (dd < bestD) (best = { ...t, x, y }), (bestD = dd)
          }
          setTip(best)
        }}
        onPointerUp={(e) => {
          pinch.current.delete(e.pointerId)
          spread.current = 0
          drag.current = null
        }}
        onPointerLeave={() => setTip(null)}
      >
        <canvas ref={canvas} className="absolute inset-0 size-full" />
        <div className="pointer-events-none absolute inset-0">
          {labels.map((l, i) => (
            <span
              key={i}
              className={cn("absolute whitespace-nowrap tabular-nums", l.name ? "text-[11px] font-medium text-foreground" : "text-[10px] text-muted-foreground")}
              style={{ left: l.x, top: l.y, opacity: grown, transform: "translate(-50%,-50%)" }}
            >
              {l.text}
            </span>
          ))}
        </div>
        {tip && (
          <ChartTip
            title={tip.title}
            rows={tip.rows}
            className="absolute z-10"
            style={{ top: tip.y, left: tip.x, transform: `translate(${tip.x > (canvas.current?.offsetWidth ?? 0) / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
          />
        )}
      </div>
      {legend}
    </figure>
  )
}

/** The cube's floor grid and its edges. */
function box(colour: (css: string) => V3): Batch {
  const c = colour("var(--border)")
  const positions: number[] = []
  for (let k = 0; k <= 4; k++) {
    const f = -1 + k / 2
    positions.push(f, -1, -1, f, 1, -1, -1, f, -1, 1, f, -1)
  }
  positions.push(-1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, 1, -1, -1, -1, -1, -1, 1)
  return { mode: LINES, positions, colours: positions.map((_, i) => c[i % 3]!) }
}

/** Values fitted into the cube, -1 to 1. */
const fit = (values: number[]) => {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return { range: [lo, hi] as [number, number], at: (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 2 - 1 : 0) }
}

type Shared3D = { colors?: string[]; formatValue?: (value: number) => string; animate?: boolean; height?: number; axes?: [string, string, string]; className?: string }

/** Points in depth, coloured by group; `line`, joined in order as one path, its colour moving from the first to the second. */
function Scatter3D({ data = [], axes = ["x", "y", "z"], height = 360, line = false, colors, formatValue = plain, animate = true, className }: Shared3D & { data?: { x: number; y: number; z: number; name?: string; group?: string }[]; line?: boolean }) {
  const X = fit(data.map((d) => d.x))
  const Y = fit(data.map((d) => d.y))
  const Z = fit(data.map((d) => d.z))
  const groups = [...new Set(data.map((d) => d.group ?? ""))]
  const at = (d: (typeof data)[number]): V3 => [X.at(d.x), Y.at(d.y), Z.at(d.z)]
  return (
    <Scene
      className={className}
      height={height}
      animate={animate}
      format={formatValue}
      label={`${data.length} points in depth`}
      legend={<ChartKey items={groups.filter(Boolean).map((name, i) => ({ name, colour: hue(colors, i) }))} />}
      axes={{ names: axes, ranges: [X.range, Y.range, Z.range] }}
      batches={(colour) => {
        if (line) {
          const [from, to] = [colour(hue(colors, 0)), colour(hue(colors, 1))]
          return [
            box(colour),
            { mode: LINE_STRIP, positions: data.flatMap(at), colours: data.flatMap((_, i) => from.map((c, k) => c + (to[k]! - c) * (i / Math.max(1, data.length - 1)))) },
          ]
        }
        return [box(colour), { mode: POINTS, round: true, size: data.length > 2000 ? 5 : 9, positions: data.flatMap(at), colours: data.flatMap((d) => colour(hue(colors, groups.indexOf(d.group ?? "")))) }]
      }}
      targets={(line ? data.filter((_, i) => i % 20 === 0) : data).map((d) => ({
        at: at(d),
        title: d.name,
        rows: ([[axes[0], d.x], [axes[1], d.y], [axes[2], d.z]] as const).map(([label, v]) => ({ label, value: formatValue(v), colour: hue(colors, groups.indexOf(d.group ?? "")) })),
      }))}
    />
  )
}

/** A skin over points, shaded by height and light, deep at the floor and pale at the top. */
function skin(points: V3[], triangles: number[], lead: V3, floor: V3): Batch {
  const normals = points.map(() => [0, 0, 0] as V3)
  for (let t = 0; t < triangles.length; t += 3) {
    const [a, b, c] = [points[triangles[t]!]!, points[triangles[t + 1]!]!, points[triangles[t + 2]!]!]
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as V3
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]] as V3
    const n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    for (const i of triangles.slice(t, t + 3)) for (let k = 0; k < 3; k++) normals[i]![k]! += n[k]!
  }
  const deep = lead.map((c, k) => c * 0.35 + floor[k]! * 0.15)
  const light = lead.map((c) => c + (1 - c) * 0.6)
  const shade = (z: number) => {
    const t = Math.max(0, Math.min(1, (z + 1) / 2))
    const smooth = t * t * (3 - 2 * t)
    const [a, b, f] = smooth < 0.5 ? [deep, lead, smooth * 2] : [lead, light, smooth * 2 - 1]
    return a.map((c, k) => c + (b[k]! - c) * f)
  }
  return { mode: TRIANGLES, positions: points.flat(), normals: normals.flat(), colours: points.flatMap((p) => shade(p[2])), indices: triangles }
}

const floorOf = "color-mix(in oklab, var(--background) 70%, var(--foreground))"

/** Heights over a grid as a lit surface, its triangles faintly drawn. */
function Surface({ z = [], x, y, axes = ["x", "y", "z"], height = 360, colors, formatValue = plain, animate = true, className }: Shared3D & { z?: (number | null)[][]; x?: (string | number)[]; y?: (string | number)[] }) {
  const rows = z.length
  const cols = Math.max(0, ...z.map((r) => r.length))
  const Z = fit(z.flat().filter((v): v is number => v !== null && Number.isFinite(v)))
  const px = (j: number) => (cols > 1 ? (j / (cols - 1)) * 2 - 1 : 0)
  const py = (i: number) => (rows > 1 ? 1 - (i / (rows - 1)) * 2 : 0)
  const points: V3[] = []
  const places: { i: number; j: number }[] = []
  const index = new Map<string, number>()
  z.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v === null || !Number.isFinite(v)) return
      index.set(`${i},${j}`, points.length)
      points.push([px(j), py(i), Z.at(v)])
      places.push({ i, j })
    }),
  )
  const triangles: number[] = []
  for (let i = 0; i < rows - 1; i++)
    for (let j = 0; j < cols - 1; j++) {
      const [a, b, c, d] = [index.get(`${i},${j}`), index.get(`${i},${j + 1}`), index.get(`${i + 1},${j}`), index.get(`${i + 1},${j + 1}`)]
      if (a !== undefined && b !== undefined && c !== undefined) triangles.push(a, b, c)
      if (b !== undefined && d !== undefined && c !== undefined) triangles.push(b, d, c)
    }
  const nameOf = (names: (string | number)[] | undefined, k: number) => String(names?.[k] ?? k)
  return (
    <Scene
      className={className}
      height={height}
      animate={animate}
      format={formatValue}
      label={`A surface of ${rows} by ${cols} heights, from ${formatValue(Z.range[0])} to ${formatValue(Z.range[1])}`}
      axes={{ names: axes, ranges: [[0, Math.max(1, cols - 1)], [0, Math.max(1, rows - 1)], Z.range] }}
      batches={(colour) => [
        box(colour),
        skin(points, triangles, colour(hue(colors, 0)), colour(floorOf)),
        {
          mode: LINES,
          alpha: 0.18,
          positions: triangles.flatMap((_, t) => (t % 3 === 0 ? [...points[triangles[t]!]!, ...points[triangles[t + 1]!]!] : [])),
          colours: triangles.flatMap((_, t) => (t % 3 === 0 ? [1, 1, 1, 1, 1, 1] : [])),
        },
      ]}
      targets={places.map((p, k) => ({ at: points[k]!, title: `${nameOf(y, p.i)} · ${nameOf(x, p.j)}`, rows: [{ label: axes[2], value: formatValue(z[p.i]![p.j] as number), colour: hue(colors, 0) }] }))}
    />
  )
}

/** Triangles joining points by their x and y, none crossing (Bowyer–Watson). */
function delaunay(points: [number, number][]) {
  const big = 1e5
  const all: [number, number][] = [...points, [-big, -big], [big, -big], [0, big]]
  const n = points.length
  let tris: [number, number, number][] = [[n, n + 1, n + 2]]
  const circle = ([a, b, c]: [number, number, number], p: [number, number]) => {
    const [ax, ay] = all[a]!
    const [bx, by] = all[b]!
    const [cx, cy] = all[c]!
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
    return (p[0] - ux) ** 2 + (p[1] - uy) ** 2 < (ax - ux) ** 2 + (ay - uy) ** 2
  }
  points.forEach((p, i) => {
    const bad = tris.filter((t) => circle(t, p))
    const edges = new Map<string, [number, number]>()
    for (const t of bad)
      for (const [u, v] of [
        [t[0], t[1]],
        [t[1], t[2]],
        [t[2], t[0]],
      ] as [number, number][]) {
        const key = u < v ? `${u},${v}` : `${v},${u}`
        edges.has(key) ? edges.delete(key) : edges.set(key, [u, v])
      }
    tris = tris.filter((t) => !bad.includes(t))
    for (const [u, v] of edges.values()) tris.push([u, v, i])
  })
  return tris.filter((t) => t.every((k) => k < n)).flat()
}

/** A skin over scattered points, each x and y once, its triangles outlined unless `edges` is false. */
function Mesh3D({ data = [], axes = ["x", "y", "z"], height = 360, edges = true, colors, formatValue = plain, animate = true, className }: Shared3D & { data?: { x: number; y: number; z: number; name?: string }[]; edges?: boolean }) {
  const X = fit(data.map((d) => d.x))
  const Y = fit(data.map((d) => d.y))
  const Z = fit(data.map((d) => d.z))
  const points: V3[] = data.map((d) => [X.at(d.x), Y.at(d.y), Z.at(d.z)])
  const triangles = delaunay(points.map((p) => [p[0], p[1]]))
  const outline = (): Batch => {
    const positions: number[] = []
    for (let t = 0; t < triangles.length; t += 3) {
      const [a, b, c] = [points[triangles[t]!]!, points[triangles[t + 1]!]!, points[triangles[t + 2]!]!]
      positions.push(...a, ...b, ...b, ...c, ...c, ...a)
    }
    return { mode: LINES, alpha: 0.35, positions, colours: positions.map(() => 1) }
  }
  return (
    <Scene
      className={className}
      height={height}
      animate={animate}
      format={formatValue}
      label={`A skin over ${data.length} points`}
      axes={{ names: axes, ranges: [X.range, Y.range, Z.range] }}
      batches={(colour) => [box(colour), skin(points, triangles, colour(hue(colors, 0)), colour(floorOf)), ...(edges ? [outline()] : [])]}
      targets={data.map((d, k) => ({
        at: points[k]!,
        title: d.name,
        rows: ([[axes[0], d.x], [axes[1], d.y], [axes[2], d.z]] as const).map(([label, v]) => ({ label, value: formatValue(v), colour: hue(colors, 0) })),
      }))}
    />
  )
}

export { Scatter3D, Surface, Mesh3D }
