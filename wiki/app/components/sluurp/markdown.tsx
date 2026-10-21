import * as React from "react"
import { cn } from "cn"

/**
 * Markdown as people and models write it in a chat: paragraphs, `#` headings, lists (one level), `>` quotes, fenced
 * code; inside a line `` `code` ``, `**bold**`, `*italic*` and `[links](https://…)`. Made as elements, never from
 * HTML, so whatever the text says it can only ever be words, lists, code and links; links go to http(s) and mailto
 * only, in a new tab. Not a document format: that is what Pages are for.
 */
function Markdown({
  text,
  codeBlock,
  className,
}: {
  text: string
  /** How a fenced block is drawn: with a copy button, say. */
  codeBlock?: (code: string) => React.ReactNode
  className?: string
}) {
  const blocks: React.ReactNode[] = []
  const lines = text.replace(/\r\n?/g, "\n").split("\n")
  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{inline(paragraph.join("\n"))}</p>)
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    const Tag = list.ordered ? "ol" : "ul"
    blocks.push(
      <Tag key={blocks.length} className={cn("grid gap-0.5 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    )
    list = null
  }
  const flush = () => (flushParagraph(), flushList())
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (/^\s*```/.test(line)) {
      flush()
      const code: string[] = []
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]!); i++) code.push(lines[i]!)
      blocks.push(
        <React.Fragment key={blocks.length}>
          {codeBlock?.(code.join("\n")) ?? (
            <pre className="overflow-x-auto rounded-md bg-background/70 px-3 py-2 font-mono text-xs leading-5">
              <code>{code.join("\n")}</code>
            </pre>
          )}
        </React.Fragment>,
      )
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/)
    const number = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const quote = line.match(/^>\s?(.*)$/)
    if (heading) {
      flush()
      blocks.push(
        <p key={blocks.length} className={heading[1]!.length <= 2 ? "font-semibold" : "font-medium"}>
          {inline(heading[2]!)}
        </p>,
      )
    } else if (bullet || number) {
      flushParagraph()
      const ordered = !!number
      if (list && list.ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? number)![1]!)
    } else if (quote) {
      flush()
      blocks.push(
        <blockquote key={blocks.length} className="border-l-2 pl-3 text-muted-foreground">
          {inline(quote[1]!)}
        </blockquote>,
      )
    } else if (list && /^\s{2,}\S/.test(line)) {
      // A list item that runs on to the next line.
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flush()
  return (
    <div data-slot="markdown" className={cn("grid gap-1.5 leading-snug", className)}>
      {blocks}
    </div>
  )
}

/** One line's marks, left to right, the first to start winning; nothing inside code is read as marks. */
function inline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_|\[([^\]]+)\]\(([^)\s]+)\)|\n/g
  let last = 0
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = out.length
    if (m[0] === "\n") out.push(<br key={key} />)
    else if (m[1] !== undefined)
      out.push(
        <code key={key} className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.9em]">
          {m[1]}
        </code>,
      )
    else if (m[2] !== undefined || m[3] !== undefined)
      out.push(
        <strong key={key} className="font-semibold">
          {inline(m[2] ?? m[3]!)}
        </strong>,
      )
    else if (m[4] !== undefined || m[5] !== undefined) out.push(<em key={key}>{inline(m[4] ?? m[5]!)}</em>)
    else if (m[6] !== undefined)
      out.push(
        /^(https?:|mailto:)/i.test(m[7]!) ? (
          <a key={key} href={m[7]} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">
            {inline(m[6])}
          </a>
        ) : (
          m[6]
        ),
      )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Only a few emoji (up to three or so): what a messenger shows big. A word or a long run of them stays text. */
export function onlyEmoji(text: unknown): boolean {
  const trimmed = String(text ?? "").trim()
  if (!trimmed || [...trimmed].length > 6) return false
  return /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u.test(trimmed) && /\p{Extended_Pictographic}/u.test(trimmed)
}

export { Markdown }
