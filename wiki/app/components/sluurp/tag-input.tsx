import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "cn"

import { useControllable } from "@/hooks/use-controllable"

/**
 * Words entered as tags: Enter or a comma adds one (a pasted list adds each), Backspace in an empty field takes the
 * last back to edit, a tag is dragged to reorder it.
 */
function TagInput({
  value,
  defaultValue = [],
  onValueChange,
  placeholder,
  disabled,
  id,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue"> & {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [tags, setTags] = useControllable(value, defaultValue, onValueChange)
  const [draft, setDraft] = React.useState("")
  const [dragging, setDragging] = React.useState<number | null>(null)
  const box = React.useRef<HTMLInputElement>(null)
  const add = (text: string) => {
    const next = [...tags]
    for (const part of text.split(/[,\n]/).map((p) => p.trim()).filter(Boolean)) if (!next.includes(part)) next.push(part)
    if (next.length !== tags.length) setTags(next)
    setDraft("")
  }
  const move = (from: number, to: number) => {
    if (from === to) return
    const next = [...tags]
    next.splice(to, 0, ...next.splice(from, 1))
    setTags(next)
  }
  return (
    <div
      data-slot="tag-input"
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1 py-0.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onClick={(e) => e.target === e.currentTarget && box.current?.focus()}
      {...props}
    >
      {tags.map((tag, i) => (
        <span
          key={tag}
          draggable={!disabled}
          onDragStart={(e) => (setDragging(i), e.dataTransfer.setData("text/plain", tag))}
          onDragOver={(e) => dragging !== null && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (dragging !== null) move(dragging, i)
            setDragging(null)
          }}
          onDragEnd={() => setDragging(null)}
          className={cn(
            "inline-flex h-6 max-w-full cursor-grab items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground active:cursor-grabbing",
            dragging === i && "opacity-50",
          )}
        >
          <span className="truncate">{tag}</span>
          {!disabled && (
            <button
              type="button"
              className="flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground"
              aria-label={`Remove ${tag}`}
              onClick={() => setTags(tags.filter((_, j) => j !== i))}
            >
              <XIcon className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={box}
        id={id}
        type="text"
        className="h-6 min-w-16 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        placeholder={tags.length ? "" : placeholder}
        value={draft}
        disabled={disabled}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            add(draft)
          } else if (e.key === "Backspace" && !draft && tags.length) {
            e.preventDefault()
            setDraft(tags[tags.length - 1]!)
            setTags(tags.slice(0, -1))
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text")
          if (!/[,\n]/.test(text)) return
          e.preventDefault()
          add(`${draft},${text}`)
        }}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  )
}

export { TagInput }
