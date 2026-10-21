import * as React from "react"
import { AppleIcon, CarIcon, CircleUserRoundIcon, ClockIcon, FlagIcon, HashIcon, LightbulbIcon, PawPrintIcon, SearchIcon, SmileIcon, VolleyballIcon } from "lucide-react"
import { cn } from "cn"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { word } from "@/lib/words"

type EmojiLabels = Record<"search" | "empty" | "recent" | Category, string>

const CATEGORIES = ["smileys", "people", "animals", "food", "travel", "activities", "objects", "symbols", "flags"] as const
type Category = (typeof CATEGORIES)[number]

const ICONS: Record<Category | "recent", React.ReactNode> = {
  recent: <ClockIcon />,
  smileys: <SmileIcon />,
  people: <CircleUserRoundIcon />,
  animals: <PawPrintIcon />,
  food: <AppleIcon />,
  travel: <CarIcon />,
  activities: <VolleyballIcon />,
  objects: <LightbulbIcon />,
  symbols: <HashIcon />,
  flags: <FlagIcon />,
}

const defaults = (): EmojiLabels => ({
  search: word("search-plain"),
  empty: word("no-emoji"),
  recent: word("emoji-recent"),
  smileys: word("emoji-smileys"),
  people: word("emoji-people"),
  animals: word("emoji-animals"),
  food: word("emoji-food"),
  travel: word("emoji-travel"),
  activities: word("emoji-activities"),
  objects: word("emoji-objects"),
  symbols: word("emoji-symbols"),
  flags: word("emoji-flags"),
})

type Emoji = { char: string; name: string; words: string }

// The emoji are loaded the first time a picker opens, not with the page.
let loading: Promise<Map<Category, Emoji[]>> | null = null
const load = () =>
  (loading ??= import("@/lib/emoji-data").then(({ EMOJI }) => {
    const byCategory = new Map<Category, Emoji[]>()
    for (const category of CATEGORIES) {
      byCategory.set(
        category,
        (EMOJI[category] ?? "")
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [char = "", name = "", words = ""] = line.split("\t")
            return { char, name, words }
          }),
      )
    }
    return byCategory
  }))

// The ones picked most, remembered in this browser.
const RECENT_KEY = "sluurp.emoji.recent"
const RECENT_MAX = 18
const readRecent = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "{}") ?? {}
  } catch {
    return {}
  }
}
const remember = (emoji: string) => {
  const counts = readRecent()
  counts[emoji] = (counts[emoji] ?? 0) + 1
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, RECENT_MAX * 2))))
  } catch {}
}
const recentList = () =>
  Object.entries(readRecent())
    .sort((a, b) => b[1] - a[1])
    .slice(0, RECENT_MAX)
    .map(([e]) => e)

const COLUMNS = 9

/** Every emoji by category (the most used first), searched by name and other words, moved through by arrows. */
function EmojiPanel({ onSelect, labels, className }: { onSelect: (emoji: string) => void; labels?: Partial<EmojiLabels>; className?: string }) {
  const words = { ...defaults(), ...labels }
  const [data, setData] = React.useState<Map<Category, Emoji[]> | null>(null)
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState(recentList)
  const [active, setActive] = React.useState<string>(() => (recentList().length ? "recent" : "smileys"))
  const scroller = React.useRef<HTMLDivElement>(null)
  const sections = React.useRef(new Map<string, HTMLElement>())
  React.useEffect(() => void load().then(setData, () => setData(new Map())), [])
  const pick = (emoji: string) => {
    remember(emoji)
    setRecent(recentList())
    onSelect(emoji)
  }
  // What matches every word typed: by name first, then by the other words.
  const found = React.useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!data || !terms.length) return null
    const named: Emoji[] = []
    const tagged: Emoji[] = []
    for (const list of data.values())
      for (const e of list) {
        if (!terms.every((w) => `${e.name} ${e.words}`.includes(w))) continue
        ;(terms.every((w) => e.name.includes(w)) ? named : tagged).push(e)
      }
    return [...named, ...tagged].slice(0, 200)
  }, [data, query])
  // The category row follows the scroll: the last section whose top has passed.
  const follow = () => {
    const el = scroller.current!
    let current = active
    for (const [key, section] of sections.current) if (section.offsetTop - el.offsetTop <= el.scrollTop + 8) current = key
    if (current !== active) setActive(current)
  }
  const jump = (key: string) => {
    setQuery("")
    requestAnimationFrame(() => {
      const section = sections.current.get(key)
      if (section) scroller.current!.scrollTo({ top: section.offsetTop - scroller.current!.offsetTop })
      setActive(key)
    })
  }
  // The arrows move through the grid a cell or a row at a time; ↓ from the search goes into it.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (!target.dataset.emoji) {
      if (e.key === "ArrowDown" && target.tagName === "INPUT") {
        e.preventDefault()
        scroller.current!.querySelector<HTMLElement>("[data-emoji]")?.focus()
      }
      return
    }
    const cells = [...scroller.current!.querySelectorAll<HTMLElement>("[data-emoji]")]
    const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS } as Record<string, number>)[e.key]
    if (step === undefined) return
    e.preventDefault()
    const next = cells[cells.indexOf(target) + step]
    if (next) next.focus()
    else if (step < 0) scroller.current!.parentElement!.querySelector<HTMLElement>("input")?.focus()
  }
  const section = (key: string, title: string, items: (Emoji | string)[]) => (
    <section key={key} ref={(el) => void (el ? sections.current.set(key, el) : sections.current.delete(key))} className="pb-2">
      <h3 className="sticky top-0 z-10 bg-popover/95 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">{title}</h3>
      <div role="grid" className="grid grid-cols-9 gap-0.5 px-2">
        {items.map((e) => {
          const char = typeof e === "string" ? e : e.char
          return (
            <button
              key={char}
              type="button"
              className="flex size-9 items-center justify-center rounded-md text-2xl leading-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              aria-label={typeof e === "string" ? e : e.name}
              data-emoji={char}
              onClick={() => pick(char)}
            >
              {char}
            </button>
          )
        })}
      </div>
    </section>
  )
  const tabs = ["recent", ...CATEGORIES].filter((k) => k !== "recent" || recent.length)
  return (
    <div data-slot="emoji-panel" className={cn("flex h-[26rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col", className)} onKeyDown={onKeyDown}>
      <div role="tablist" className="flex shrink-0 items-center border-b px-1">
        {tabs.map((key) => {
          const on = !found && active === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-label={words[key as keyof EmojiLabels]}
              aria-selected={on}
              className={cn(
                "relative flex h-9 min-w-0 flex-1 items-center justify-center text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-[18px] [&_svg]:shrink-0",
                on && "text-primary after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
              )}
              onClick={() => jump(key)}
            >
              {ICONS[key as Category]}
            </button>
          )
        })}
      </div>
      <div className="relative shrink-0 p-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          className="h-8 w-full rounded-lg border border-input bg-transparent pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder={words.search}
          aria-label={words.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1" onScroll={follow}>
        {!data ? (
          <div className="grid grid-cols-9 gap-0.5 px-2 pt-8">
            {Array.from({ length: 36 }, (_, i) => (
              <Skeleton key={i} className="m-1 size-7" />
            ))}
          </div>
        ) : found ? (
          found.length ? (
            section("results", `${words.search}: ${query.trim()}`, found)
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{words.empty}</p>
          )
        ) : (
          <>
            {recent.length > 0 && section("recent", words.recent, recent)}
            {CATEGORIES.map((key) => section(key, words[key], data.get(key) ?? []))}
          </>
        )}
      </div>
    </div>
  )
}

/** The emoji panel in a popover, opened by `children` (a button); closed after a pick unless `keepOpen`. */
function EmojiPicker({
  children,
  onSelect,
  side = "top",
  align = "end",
  keepOpen = false,
  labels,
  className,
}: {
  children: React.ReactElement
  onSelect: (emoji: string) => void
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  keepOpen?: boolean
  labels?: Partial<EmojiLabels>
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent side={side} align={align} className={cn("w-auto p-0", className)}>
        <EmojiPanel
          labels={labels}
          onSelect={(emoji) => {
            onSelect(emoji)
            if (!keepOpen) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { EmojiPicker, EmojiPanel, type EmojiLabels }
