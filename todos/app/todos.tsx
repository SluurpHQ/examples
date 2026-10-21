// A to-do list everyone edits at once, with everyone's cursor on it.
import { useEffect, useRef, useState } from "react"
import { Sluurp } from "@sluurp/client"
import { liveCursors } from "@sluurp/client/cursors"
import { useLive } from "@sluurp/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

type Todo = { id: string; title: string; done: boolean }

const todos = new Sluurp().collection("todos")

export function Todos({ resets }: { resets?: number }) {
  const { rows } = useLive<Todo>("todos", { sort: "-created_at", keep: true })
  const [title, setTitle] = useState("")
  const list = useRef<HTMLElement>(null)
  useEffect(() => liveCursors("todos:*", { over: list.current ?? undefined }), [])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) todos.create({ title: title.trim(), done: false })
    setTitle("")
  }

  return (
    <section ref={list} className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Todos Collab</h1>
        {resets ? <Countdown every={resets} /> : null}
      </div>
      <form className="flex gap-2" onSubmit={add}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
        <Button type="submit">Add</Button>
      </form>
      <ul className="mt-4 divide-y rounded-lg border">
        {rows.map((todo) => (
          <li key={todo.id} className="flex items-center gap-3 px-3 py-2">
            <Checkbox checked={todo.done} onCheckedChange={(done) => todos.update(todo.id, { done })} />
            <span className={todo.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{todo.title}</span>
            <Button variant="ghost" size="sm" onClick={() => todos.delete(todo.id)}>Remove</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Minutes to the next reset, when the list is reset every few minutes (the website's copy). */
function Countdown({ every }: { every: number }) {
  const left = () => {
    const ms = every * 60_000 - (Date.now() % (every * 60_000))
    return `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`
  }
  const [shown, setShown] = useState(left)
  useEffect(() => {
    const timer = setInterval(() => setShown(left()), 1000)
    return () => clearInterval(timer)
  }, [every])
  return <span className="text-xs tabular-nums text-muted-foreground">Resetting in {shown}</span>
}
