// A to-do list everybody edits at once, with everybody's cursor on it.
// An island: drawn on the server with the page it is in, then alive in
// the browser — on this app's own page, or on any other that embeds it.
import { signal } from "sluurp/reactive";
import { Button } from "sluurp/kit/button.js";
import { Checkbox } from "sluurp/kit/checkbox.js";
import { Input } from "sluurp/kit/input.js";
import { Sync, type RowOf } from "sluurp/sync";
import { liveCursors } from "sluurp/cursors";
import type { schema } from "../routes/index.tsx";

// A row as the route's schema declares it: its fields are written once, there.
type Todo = RowOf<typeof schema.todos>;

/** Minutes to the next reset, counting down, when a page resets the list (`resets`, in minutes). */
function countdown(every: number) {
  const left = signal("");
  const tick = () => {
    const ms = every * 60_000 - (Date.now() % (every * 60_000));
    left.set(`${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`);
  };
  tick();
  setInterval(tick, 1000);
  return left;
}

export default function Todos({ resets }: { resets?: number } = {}, island?: HTMLElement) {
  // Newest first, and kept in the browser too, so a refresh shows the list at once.
  const todos = new Sync().shape<Todo>("todos", { sort: "-created_at", keep: true });
  // The cursors are the list's: shown over it, not over the page it is in.
  liveCursors("todos:*", { over: island });
  const title = signal("");

  const add = (e: Event) => {
    e.preventDefault();
    if (title().trim()) todos.create({ title: title().trim(), done: false });
    title.set("");
  };

  return (
    <section class="mx-auto max-w-md px-4 py-12">
      <div class="mb-6 flex items-baseline justify-between gap-4">
        <h1 class="text-2xl font-semibold">Todos Collab</h1>
        {resets ? <span class="text-xs tabular-nums text-muted-foreground">Resetting in {countdown(resets)}</span> : ""}
      </div>
      <form class="flex gap-2" onSubmit={add}>
        <Input value={title} placeholder="What needs doing?" />
        <Button type="submit">Add</Button>
      </form>
      <ul class="mt-4 divide-y rounded-lg border">
        {() =>
          todos.rows().map((todo) => (
            <li class="flex items-center gap-3 px-3 py-2">
              <Checkbox checked={todo.done} onChange={(done: boolean | "indeterminate") => todos.update(todo.id, { done: done === true })} />
              <span class={todo.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}>{todo.title}</span>
              <Button variant="ghost" size="sm" onClick={() => todos.delete(todo.id)}>Remove</Button>
            </li>
          ))
        }
      </ul>
    </section>
  );
}
