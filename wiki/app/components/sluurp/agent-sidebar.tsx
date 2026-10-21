import * as React from "react"
import { EllipsisIcon, SparklesIcon, XIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tip } from "@/components/sluurp/tip"

type MenuEntry = { label: string; destructive?: boolean; heading?: boolean; separator?: boolean; onSelect?: () => void }

/** The menu cut at its separators and headings: a heading leads the group it names. */
const sections = (menu: MenuEntry[]) =>
  menu.reduce<(MenuEntry[] | "separator")[]>((all, entry) => {
    const last = all.at(-1)
    if (entry.separator) all.push("separator")
    else if (entry.heading || !Array.isArray(last)) all.push([entry])
    else last.push(entry)
    return all
  }, [])

const MIN = 320

const useWide = (from: number) =>
  React.useSyncExternalStore(
    (changed) => {
      const query = matchMedia(`(min-width: ${from}px)`)
      query.addEventListener("change", changed)
      return () => query.removeEventListener("change", changed)
    },
    () => matchMedia(`(min-width: ${from}px)`).matches,
    () => true,
  )

/**
 * An assistant's panel: docked at the right of the page from `wideFrom` up (the page making room, its width
 * dragged and kept on this device), a sheet from the bottom below it. Its head has its mark, name, tools and menu.
 */
function AgentSidebar({
  open,
  onOpenChange,
  title,
  subtitle,
  mark,
  children,
  placement = "fixed",
  storageKey = "sluurp.agent.width",
  tools,
  menu = [],
  closeLabel = "Close",
  wideFrom = 1024,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  mark?: React.ReactNode
  children: React.ReactNode
  /** Over the page's right edge, the page making room (`fixed`), or a column of a layout (`inline`). */
  placement?: "fixed" | "inline"
  storageKey?: string
  tools?: React.ReactNode
  menu?: MenuEntry[]
  closeLabel?: string
  wideFrom?: number
}) {
  const wide = useWide(wideFrom)
  const [width, setWidth] = React.useState(() => {
    try {
      return Number(localStorage.getItem(storageKey)) || 416
    } catch {
      return 416
    }
  })
  const fits = (w: number) => Math.round(Math.max(MIN, Math.min(w, (typeof innerWidth === "number" ? innerWidth : 1600) * 0.6)))
  const keep = (w: number) => {
    setWidth(fits(w))
    try {
      localStorage.setItem(storageKey, String(fits(w)))
    } catch {}
  }
  // Docked over the page, the page moves in to make room.
  React.useEffect(() => {
    if (placement !== "fixed") return
    document.documentElement.style.paddingRight = open && wide ? `${fits(width)}px` : ""
    return () => void (document.documentElement.style.paddingRight = "")
  }, [open, wide, width, placement])
  const head = (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b px-3 select-none">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-3.5">{mark ?? <SparklesIcon />}</span>
      <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <h2 className="shrink-0 text-sm font-semibold">{title}</h2>
        {subtitle && <span className="min-w-0 truncate text-sm text-muted-foreground">{subtitle}</span>}
      </div>
      {tools}
      {menu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="More" />}>
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {sections(menu).map((section, s) =>
              section === "separator" ? (
                <DropdownMenuSeparator key={s} />
              ) : (
                <DropdownMenuGroup key={s}>
                  {section.map((entry, i) =>
                    entry.heading ? (
                      <DropdownMenuLabel key={i}>{entry.label}</DropdownMenuLabel>
                    ) : (
                      <DropdownMenuItem key={i} variant={entry.destructive ? "destructive" : "default"} onClick={entry.onSelect}>
                        {entry.label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuGroup>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Tip label={closeLabel}>
        <Button variant="ghost" size="icon-sm" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
          <XIcon />
        </Button>
      </Tip>
    </header>
  )
  if (!wide)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[85dvh] flex-col gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          {head}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  if (!open) return null
  return (
    <aside
      aria-label={typeof title === "string" ? title : "Assistant"}
      className={cn(
        "flex flex-col border-l bg-background",
        placement === "fixed" ? "fixed inset-y-0 right-0 z-40 shadow-xl" : "relative h-full min-h-0 shrink-0",
      )}
      style={{ width: fits(width) }}
    >
      {/* Its left edge dragged to widen it, kept once let go; the arrow keys too. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={fits(width)}
        aria-valuemin={MIN}
        tabIndex={0}
        className="absolute inset-y-0 left-0 z-10 hidden w-1.5 -translate-x-1/2 cursor-col-resize outline-none hover:bg-primary/20 focus-visible:bg-primary/30 pointer-fine:block"
        onPointerDown={(e) => {
          const from = fits(width)
          const x = e.clientX
          const el = e.currentTarget
          el.setPointerCapture(e.pointerId)
          const follow = (m: PointerEvent) => setWidth(fits(from - (m.clientX - x)))
          el.addEventListener("pointermove", follow)
          el.addEventListener("pointerup", (u: PointerEvent) => (el.removeEventListener("pointermove", follow), keep(from - (u.clientX - x))), { once: true })
        }}
        onKeyDown={(e) => {
          const by = { ArrowLeft: 16, ArrowRight: -16 }[e.key]
          if (by) (e.preventDefault(), keep(width + by))
        }}
      />
      {head}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  )
}

export { AgentSidebar, type MenuEntry }
