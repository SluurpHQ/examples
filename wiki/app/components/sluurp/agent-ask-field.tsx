import * as React from "react"
import { SendIcon, SparklesIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Tip } from "@/components/sluurp/tip"
import { useControllable } from "@/hooks/use-controllable"

/**
 * A floating field to ask an assistant, a pill at the bottom of a page: Enter asks; its mark opens the conversation,
 * as does "3 asked" in place of the send button when nothing is typed.
 */
function AgentAskField({
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Ask AI",
  label = "Ask AI",
  onAsk,
  onOpen,
  openLabel = "Open the conversation",
  count = 0,
  openCountLabel = (n) => `${n} asked`,
  sendLabel = "Send",
  mark,
  spellCheck = true,
  className,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (text: string) => void
  placeholder?: string
  label?: string
  onAsk: (text: string) => void
  onOpen?: () => void
  openLabel?: string
  /** How many questions were asked already. */
  count?: number
  openCountLabel?: (n: number) => string
  sendLabel?: string
  mark?: React.ReactNode
  /** The browser's spelling check: off when asking about code or names it would mark. */
  spellCheck?: boolean
  className?: string
}) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const send = () => text.trim() && onAsk(text.trim())
  return (
    <div
      data-slot="agent-ask-field"
      className={cn(
        "mx-auto flex w-full max-w-xl items-center gap-2 rounded-full border-2 border-primary/45 bg-background/95 py-1.5 pr-1.5 pl-4 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.35)] backdrop-blur",
        className,
      )}
    >
      <Tip label={openLabel}>
        <button type="button" aria-label={openLabel} className="-ml-1.5 flex size-7 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10" onClick={onOpen}>
          {mark ?? <SparklesIcon className="size-4" />}
        </button>
      </Tip>
      <input
        type="text"
        spellCheck={spellCheck}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        placeholder={placeholder}
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
      />
      {count > 0 && !text.trim() && onOpen ? (
        <Button variant="ghost" size="sm" className="rounded-full" onClick={onOpen}>
          {openCountLabel(count)}
        </Button>
      ) : (
        <Button size="icon" className="size-8 rounded-full" aria-label={sendLabel} disabled={!text.trim()} onClick={send}>
          <SendIcon />
        </Button>
      )}
    </div>
  )
}

export { AgentAskField }
