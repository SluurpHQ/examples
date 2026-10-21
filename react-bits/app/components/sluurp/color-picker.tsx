import * as React from "react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { useControllable } from "@/hooks/use-controllable"

const PRESETS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#737373", "#000000", "#ffffff"]

const toHsv = (hex: string): [number, number, number] => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim())
  if (!m) return [0, 0, 0]
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(h * 60 + 360) % 360, max ? d / max : 0, max]
}

const toHex = (h: number, s: number, v: number) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

/**
 * A colour, `#rrggbb`, from a swatch that opens a picker: saturation and brightness on a square, the hue on a
 * slider, the hex typed, and a row of presets.
 */
function ColorPicker({
  value,
  defaultValue = "#000000",
  onValueChange,
  presets = PRESETS,
  className,
  swatchClassName,
  "aria-label": ariaLabel = "Colour",
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (hex: string) => void
  presets?: string[]
  className?: string
  swatchClassName?: string
  "aria-label"?: string
}) {
  const [hex, setHex] = useControllable(value, defaultValue, onValueChange)
  const [, s, v] = toHsv(hex)
  // The hue is kept apart from the colour: at grey or black every hue is the same colour, and it must not jump.
  const [hue, setHue] = React.useState(() => toHsv(hex)[0])
  React.useEffect(() => {
    const [h, s, v] = toHsv(hex)
    if (s > 0 && v > 0 && toHex(hue, s, v) !== hex.toLowerCase()) setHue(h)
  }, [hex])
  const pick = (h: number, s: number, v: number) => {
    setHue(h)
    setHex(toHex(h, s, v))
  }
  const canvas = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const c = canvas.current
    if (!c) return
    const g = c.getContext("2d")!
    const [w, h] = [c.width, c.height]
    g.fillStyle = `hsl(${hue} 100% 50%)`
    g.fillRect(0, 0, w, h)
    const white = g.createLinearGradient(0, 0, w, 0)
    white.addColorStop(0, "#fff")
    white.addColorStop(1, "rgb(255 255 255 / 0)")
    g.fillStyle = white
    g.fillRect(0, 0, w, h)
    const black = g.createLinearGradient(0, h, 0, 0)
    black.addColorStop(0, "#000")
    black.addColorStop(1, "rgb(0 0 0 / 0)")
    g.fillStyle = black
    g.fillRect(0, 0, w, h)
  })
  const fromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    pick(hue, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)))
  }
  return (
    <Popover>
      <PopoverTrigger aria-label={ariaLabel} className={cn("size-5 shrink-0 rounded-sm border", swatchClassName)} style={{ background: hex }} />
      <PopoverContent align="start" className={cn("w-auto p-3", className)}>
        <div className="grid w-56 gap-3">
          <div
            className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded-md bg-black"
            onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), fromPointer(e))}
            onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
          >
            <canvas ref={canvas} width="224" height="144" className="pointer-events-none absolute inset-0 size-full" />
            <span className="pointer-events-none absolute inset-0 rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.35)]" />
            <span
              className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]"
              style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex }}
            />
          </div>
          <Slider
            aria-label="Hue"
            min={0}
            max={359}
            value={[Math.round(hue)]}
            onValueChange={(next) => pick(Array.isArray(next) ? next[0]! : next, s, v)}
            className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]"
          />
          <Input
            key={hex}
            defaultValue={hex}
            aria-label="Hex"
            className="h-8 font-mono text-xs md:text-xs"
            onChange={(e) => {
              const t = e.target.value.trim()
              const typed = t.startsWith("#") ? t : `#${t}`
              if (/^#[\da-f]{6}$/i.test(typed)) setHex(typed.toLowerCase())
            }}
          />
          <div className="grid grid-cols-8 gap-1.5">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                className={cn("size-5 rounded-sm border", hex.toLowerCase() === c.toLowerCase() && "ring-2 ring-ring ring-offset-1 ring-offset-background")}
                style={{ background: c }}
                onClick={() => setHex(c)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { ColorPicker }
