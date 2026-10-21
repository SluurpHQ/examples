import * as React from "react"
import { ClipboardPasteIcon, DicesIcon, ExternalLinkIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Tip } from "@/components/sluurp/tip"
import { paletteFrom, paletteUses, randomPalette, saturate, SATURATION_CHOSEN, SATURATION_MAX, saturationTrack } from "@/lib/palettes"
import { word } from "@/lib/words"

/**
 * A palette to edit: a strip of its colours (each says what it makes in the theme), another throw of the dice, a
 * Coolors palette pasted, the palette opened on Coolors, back to the default; and how vivid it is shown.
 */
function PaletteEditor({
  value = null,
  fallback = ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  onValueChange,
  saturation,
  onSaturationChange,
  label = word("palette"),
  resetLabel = word("reset"),
  paint = (c) => c,
  track,
  className,
}: {
  /** The palette chosen; `null` for none, the fallback shown then. */
  value?: string[] | null
  fallback?: string[]
  onValueChange?: (palette: string[] | null) => void
  /** How vivid it is shown, 0 to 100 (60 as chosen); with it, a slider. */
  saturation?: number
  /** At each step (`resting` false) to show it, and once the slider rests (`resting` true) to keep it: one save, not one a step. */
  onSaturationChange?: (value: number | undefined, resting: boolean) => void
  label?: React.ReactNode
  resetLabel?: string
  /** How a colour is painted in the strip: toned for the surface, say. */
  paint?: (colour: string) => string
  /** The slider's track, when not the lead colour from grey to vivid. */
  track?: string
  className?: string
}) {
  const base = value ?? fallback
  const vivid = saturation ?? SATURATION_CHOSEN
  const shown = saturate(base, vivid)
  const uses = paletteUses(base)
  const [pasting, setPasting] = React.useState(false)
  const [said, setSaid] = React.useState("")
  const rest = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const take = async (text: string) => {
    const found = await paletteFrom(text)
    if (found.length < 2) return false
    setPasting(false)
    onValueChange?.(found)
    onSaturationChange?.(undefined, true)
    return true
  }
  const Tiny = ({ name, onClick, disabled, children }: { name: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <Tip label={name}>
      <Button variant="ghost" size="icon-xs" className="size-5 text-muted-foreground [&_svg]:size-3!" aria-label={name} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </Tip>
  )
  return (
    <div data-slot="palette-editor" className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <span className="flex min-h-5 items-center gap-1.5 text-sm select-none">
        {label}
        <Tiny name={resetLabel} onClick={() => onValueChange?.(null)} disabled={!value}>
          <RotateCcwIcon />
        </Tiny>
        <Tiny name={word("palette-paste")} onClick={() => setPasting(true)}>
          <ClipboardPasteIcon />
        </Tiny>
        <Tiny name={word("palette-open-coolors")} onClick={() => window.open(`https://coolors.co/palette/${base.map((c) => c.replace("#", "")).join("-")}`, "_blank", "noopener")}>
          <ExternalLinkIcon />
        </Tiny>
      </span>
      <div className="flex items-center gap-0.5">
        <div className="flex h-8 min-w-0 flex-1 overflow-hidden rounded-md border">
          {shown.map((c, i) => (
            <Tip key={i} label={uses[i]?.join(", ") || word("palette-unused")}>
              <span className="h-full flex-1" style={{ background: paint(c) }} />
            </Tip>
          ))}
        </div>
        <Tip label={word("palette-shuffle")}>
          <Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={word("palette-shuffle")} onClick={() => onValueChange?.(randomPalette(base))}>
            <DicesIcon />
          </Button>
        </Tip>
      </div>
      {pasting && (
        <Input
          autoFocus
          className="h-8 text-sm"
          placeholder={word("palette-paste-here")}
          onPaste={async (e) => {
            e.preventDefault()
            if (await take(e.clipboardData.getData("text/plain"))) return
            setSaid(word("palette-paste-none"))
            setTimeout(() => setSaid(""), 3000)
          }}
          onChange={(e) => void take(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setPasting(false)}
          onBlur={() => setPasting(false)}
        />
      )}
      {said && (
        <p className="text-xs text-muted-foreground" role="status">
          {said}
        </p>
      )}
      {saturation !== undefined && (
        <div className="flex items-center gap-3 pt-1">
          <span className="w-16 shrink-0 text-[13px] text-muted-foreground select-none">{word("vibrancy")}</span>
          <Slider
            aria-label={word("vibrancy")}
            min={0}
            max={SATURATION_MAX}
            step={5}
            value={[vivid]}
            style={{ "--track": track ?? saturationTrack(base) } as React.CSSProperties}
            className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-(image:--track)"
            onValueChange={(next) => {
              const v = Array.isArray(next) ? next[0]! : next
              const kept = v === SATURATION_CHOSEN ? undefined : v
              onSaturationChange?.(kept, false)
              clearTimeout(rest.current)
              rest.current = setTimeout(() => onSaturationChange?.(kept, true), 350)
            }}
          />
        </div>
      )}
    </div>
  )
}

export { PaletteEditor }
