import * as React from "react"
import { geoBounds, geoMercator, geoPath } from "d3-geo"
import { cn } from "cn"

import { hue, plain } from "@/components/sluurp/chart-plot"
import { ChartTip, type TipRow } from "@/components/sluurp/chart-svg"

// ISO 3166 alpha-3 codes to the numbers the world atlas uses: BEL is 056.
const ISO =
  "AFG004ALB008DZA012AGO024ARG032ARM051AUS036AUT040AZE031BHS044BGD050BLR112BEL056BLZ084BEN204BTN064BOL068BIH070BWA072BRA076BRN096BGR100BFA854BDI108KHM116CMR120CAN124CAF140TCD148CHL152CHN156COL170COG178COD180CRI188CIV384HRV191CUB192CYP196CZE203DNK208DJI262DOM214ECU218EGY818SLV222GNQ226ERI232EST233SWZ748ETH231FLK238FJI242FIN246FRA250ATF260GAB266GMB270GEO268DEU276GHA288GRC300GRL304GTM320GIN324GNB624GUY328HTI332HND340HUN348ISL352IND356IDN360IRN364IRQ368IRL372ISR376ITA380JAM388JPN392JOR400KAZ398KEN404PRK408KOR410KWT414KGZ417LAO418LVA428LBN422LSO426LBR430LBY434LTU440LUX442MDG450MWI454MYS458MLI466MRT478MEX484MDA498MNG496MNE499MAR504MOZ508MMR104NAM516NPL524NLD528NCL540NZL554NIC558NER562NGA566MKD807NOR578OMN512PAK586PSE275PAN591PNG598PRY600PER604PHL608POL616PRT620PRI630QAT634ROU642RUS643RWA646SAU682SEN686SRB688SLE694SVK703SVN705SLB090SOM706ZAF710SSD728ESP724LKA144SDN729SUR740SWE752CHE756SYR760TWN158TJK762TZA834THA764TLS626TGO768TTO780TUN788TUR792TKM795UGA800UKR804ARE784GBR826USA840URY858UZB860VUT548VEN862VNM704ESH732YEM887ZMB894ZWE716SGP702MLT470AND020MCO492LIE438SMR674VAT336"
const numeric = new Map(Array.from({ length: ISO.length / 6 }, (_, i) => [ISO.slice(i * 6, i * 6 + 3), ISO.slice(i * 6 + 3, i * 6 + 6)]))

type Country = { id?: string; properties: { name: string }; type: "Feature"; geometry: any }

// The countries' shapes, loaded the first time a map colours them.
let world: Promise<Country[]> | null = null
const countries = () =>
  (world ??= Promise.all([import("world-atlas/countries-110m.json"), import("topojson-client")]).then(([topo, { feature }]) => {
    const t = (topo as any).default ?? topo
    return (feature(t, t.objects.countries) as unknown as { features: Country[] }).features
  }))

/** A country by its ISO code (BEL), number (056) or name. */
const keyOf = (name: string) => {
  const s = String(name).trim()
  if (/^\d{1,3}$/.test(s)) return s.padStart(3, "0")
  return numeric.get(s.toUpperCase()) ?? s.toLowerCase()
}

type Point = { lon: number; lat: number; name?: string; value?: number; group?: string }

const TILE = 256
const mercator = (lon: number, lat: number, zoom: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180)
  const n = TILE * 2 ** zoom
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n] as const
}

const useDark = () =>
  React.useSyncExternalStore(
    (changed) => {
      const watch = new MutationObserver(changed)
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
      return () => watch.disconnect()
    },
    () => document.documentElement.classList.contains("dark"),
    () => false,
  )

/**
 * A map of places on map tiles (OpenStreetMap's, or `tiles` of yours): dragged to move, double-clicked to come
 * closer, fitted to what is on it. Places as dots sized by their value, or as a glow where they crowd (`density`);
 * countries coloured by a value (`values`, a choropleth).
 */
function TileMap({
  points = [],
  values = [],
  density = false,
  height = 320,
  tiles,
  colors,
  formatValue = plain,
  className,
}: {
  points?: Point[]
  /** Countries coloured by a value, each by its ISO code (BEL), number or name. */
  values?: { country: string; value: number }[]
  density?: boolean
  height?: number
  /** `{z}/{x}/{y}` filled in, `{r}` with `@2x` on a sharp screen, `{mode}` with `light` or `dark`. */
  tiles?: string
  colors?: string[]
  formatValue?: (value: number) => string
  className?: string
}) {
  const dark = useDark()
  const box = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(640)
  const [shapes, setShapes] = React.useState<Country[] | null>(null)
  const [view, setView] = React.useState<{ x: number; y: number; zoom: number } | null>(null)
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [country, setCountry] = React.useState<Country | null>(null)
  const [pointer, setPointer] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{ x: number; y: number; from: { x: number; y: number; zoom: number } } | null>(null)
  React.useEffect(() => {
    const resized = new ResizeObserver(([e]) => e!.contentRect.width > 0 && setWidth(Math.round(e!.contentRect.width)))
    resized.observe(box.current!)
    if (values.length) countries().then(setShapes, () => setShapes([]))
    return () => resized.disconnect()
  }, [])
  const groups = [...new Set(points.map((p) => p.group ?? ""))]
  const colourOf = (p: Point) => hue(colors, groups.indexOf(p.group ?? ""))
  const byKey = new Map(values.map((v) => [keyOf(v.country), v]))
  const valueOf = (c: Country) => byKey.get(c.id ?? "") ?? byKey.get(c.properties.name.toLowerCase())
  const known = values.map((v) => v.value)
  const lo = Math.min(...known)
  const hi = Math.max(...known)
  const lead = hue(colors, 0)
  const shade = (v: number) => `color-mix(in oklab, ${lead} ${Math.round(25 + (hi > lo ? (v - lo) / (hi - lo) : 1) * 60)}%, transparent)`
  const biggest = Math.max(1, ...points.map((p) => Math.abs(p.value ?? 0)))
  // Fitted to its places and coloured countries, as close as they all fit.
  const fitted = React.useMemo(() => {
    const coloured = (shapes ?? []).filter(valueOf).map((c) => geoBounds(c as any))
    const lons = [...points.map((p) => p.lon), ...coloured.flatMap(([[w], [e]]) => (e! < w! ? [] : [w!, e!]))]
    const lats = [...points.map((p) => p.lat), ...coloured.flatMap(([[, s], [, n]]) => [Math.max(-70, s!), Math.min(75, n!)])]
    if (!lons.length) {
      const [x, y] = mercator(4.35, 50.85, values.length ? 1 : 3)
      return { x, y, zoom: values.length ? 1 : 3 }
    }
    const lon = (Math.min(...lons) + Math.max(...lons)) / 2
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2
    let zoom = 16
    while (zoom > 1) {
      const [a, b] = mercator(Math.min(...lons), Math.max(...lats), zoom)
      const [c, d] = mercator(Math.max(...lons), Math.min(...lats), zoom)
      if (c - a < width * 0.8 && d - b < height * 0.8) break
      zoom--
    }
    const [x, y] = mercator(lon, lat, zoom)
    return { x, y, zoom }
  }, [shapes, width, points, values])
  const now = view ?? fitted
  const at = (lon: number, lat: number) => {
    const [x, y] = mercator(lon, lat, now.zoom)
    return [x - now.x + width / 2, y - now.y + height / 2] as const
  }
  const source = (tiles ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png").replace("{mode}", dark ? "dark" : "light")
  const sharp = typeof devicePixelRatio === "number" && devicePixelRatio > 1 ? "@2x" : ""
  const level = Math.max(0, Math.min(19, Math.floor(now.zoom)))
  const size = TILE * 2 ** (now.zoom - level)
  const n = 2 ** level
  const left = now.x - width / 2
  const top = now.y - height / 2
  const imgs: React.ReactNode[] = []
  for (let tx = Math.floor(left / size); tx <= Math.floor((left + width) / size); tx++)
    for (let ty = Math.max(0, Math.floor(top / size)); ty <= Math.min(n - 1, Math.floor((top + height) / size)); ty++) {
      const wrapped = ((tx % n) + n) % n
      imgs.push(
        <img
          key={`${tx}-${ty}-${level}`}
          src={source.replace("{r}", sharp).replace("{z}", String(level)).replace("{x}", String(wrapped)).replace("{y}", String(ty))}
          alt=""
          draggable={false}
          loading="lazy"
          className="absolute max-w-none"
          style={{ left: Math.floor(tx * size - left), top: Math.floor(ty * size - top), width: Math.ceil(size) + 1, height: Math.ceil(size) + 1 }}
        />,
      )
    }
  const path = React.useMemo(() => {
    const k = TILE * 2 ** now.zoom
    return geoPath(geoMercator().scale(k / (2 * Math.PI)).translate([k / 2 - now.x + width / 2, k / 2 - now.y + height / 2]))
  }, [now, width, height])
  // The glow where places crowd: soft discs added up on a canvas, tinted by a filter.
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const glow = `heat-${React.useId().replace(/:/g, "")}`
  React.useEffect(() => {
    const c = canvas.current
    const g = c?.getContext("2d")
    if (!c || !g) return
    c.width = width
    c.height = height
    g.clearRect(0, 0, width, height)
    g.globalCompositeOperation = "lighter"
    for (const p of points) {
      const [cx, cy] = at(p.lon, p.lat)
      const disc = g.createRadialGradient(cx, cy, 0, cx, cy, 28)
      disc.addColorStop(0, `rgba(0,0,0,${0.25 * (p.value === undefined ? 1 : Math.abs(p.value) / biggest + 0.2)})`)
      disc.addColorStop(1, "rgba(0,0,0,0)")
      g.fillStyle = disc
      g.fillRect(cx - 28, cy - 28, 56, 56)
    }
  })
  const zoomBy = (step: number, px: number, py: number) => {
    const zoom = Math.max(1, Math.min(18, now.zoom + step))
    const k = 2 ** (zoom - now.zoom)
    setView({ x: (now.x - width / 2 + px) * k - px + width / 2, y: (now.y - height / 2 + py) * k - py + height / 2, zoom })
  }
  let tip: { title?: React.ReactNode; rows: TipRow[]; x: number; y: number } | null = null
  if (country && hovered === null) {
    const got = valueOf(country)
    tip = { title: country.properties.name, rows: got ? [{ label: "Value", value: formatValue(got.value), colour: shade(got.value) }] : [], ...pointer }
  } else if (hovered !== null) {
    const p = points[hovered]!
    const [x, y] = at(p.lon, p.lat)
    tip = {
      title: p.name,
      rows: [p.value === undefined ? { label: "Where", value: `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`, colour: colourOf(p) } : { label: "Value", value: formatValue(p.value), colour: colourOf(p) }],
      x,
      y,
    }
  }
  return (
    <figure data-slot="tile-map" className={cn("relative grid w-full gap-3", className)}>
      <div
        ref={box}
        className="relative touch-none overflow-hidden rounded-lg border bg-muted select-none"
        style={{ height }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPointer({ x: e.clientX - r.left, y: e.clientY - r.top })
          const d = drag.current
          if (d) setView({ x: d.from.x - (e.clientX - d.x), y: d.from.y - (e.clientY - d.y), zoom: d.from.zoom })
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, from: now }
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (setHovered(null), setCountry(null))}
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          zoomBy(1, e.clientX - r.left, e.clientY - r.top)
        }}
      >
        <div className="pointer-events-none absolute inset-0">{imgs}</div>
        {density && <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full opacity-85" style={{ filter: `url(#${glow})` }} />}
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" role="img" aria-label={points.map((p) => p.name ?? `${p.lat}, ${p.lon}`).join(", ")}>
          {density && (
            <defs>
              <filter id={glow}>
                <feColorMatrix type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.35  0 0 0 0 0.95  0 0 0 2.2 0" />
              </filter>
            </defs>
          )}
          {shapes?.map((c, i) => {
            const got = valueOf(c)
            if (!got) return null
            return (
              <path
                key={i}
                d={path(c as any) ?? ""}
                fill={shade(got.value)}
                fillOpacity={country === c ? 1 : 0.85}
                stroke={lead}
                className="pointer-events-auto"
                onPointerEnter={() => setCountry(c)}
                onPointerLeave={() => setCountry((now) => (now === c ? null : now))}
              />
            )
          })}
          {!density &&
            points.map((p, i) => {
              const [cx, cy] = at(p.lon, p.lat)
              const r = p.value === undefined ? 3.5 : 3 + 4 * Math.sqrt(Math.abs(p.value) / biggest)
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={hovered === i ? r + 2 : r}
                  fill={colourOf(p)}
                  fillOpacity={0.85}
                  stroke="var(--background)"
                  strokeWidth={1.5}
                  className="pointer-events-auto"
                  onPointerEnter={() => setHovered(i)}
                  onPointerLeave={() => setHovered((now) => (now === i ? null : now))}
                />
              )
            })}
        </svg>
        {tip && (
          <ChartTip
            title={tip.title}
            rows={tip.rows}
            className="absolute z-10"
            style={{ top: tip.y, left: tip.x, transform: `translate(${tip.x > width / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
          />
        )}
        <span className="pointer-events-none absolute right-1 bottom-1 rounded bg-background/80 px-1.5 text-[10px] text-muted-foreground">© OpenStreetMap contributors</span>
      </div>
      {values.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatValue(lo)}</span>
          <span className="h-2 w-32 rounded-full" style={{ background: `linear-gradient(90deg, ${shade(lo)}, ${shade(hi)})` }} />
          <span className="tabular-nums">{formatValue(hi)}</span>
        </div>
      )}
    </figure>
  )
}

/** Countries coloured by a value, on the map; places too. */
const GeoMap = (props: React.ComponentProps<typeof TileMap>) => <TileMap height={300} {...props} />

export { TileMap, GeoMap, type Point }
