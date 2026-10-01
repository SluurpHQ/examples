/**
 * A .tsx page: TypeScript and JSX, compiled by the server.
 *
 * The elements below become calls into `sluurp/ui/jsx-runtime`, which builds
 * real DOM — there is no virtual tree and nothing to reconcile. A value that
 * changes is a signal, and a signal in an expression wires an effect that
 * updates exactly the attribute or text node it belongs to.
 */

import { signal, computed } from "sluurp/reactive";
import { mount } from "sluurp/ui";
import { Badge } from "sluurp/kit/badge.js";
import { Button } from "sluurp/kit/button.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "sluurp/kit/card.js";

interface Item {
  id: number;
  label: string;
  done: boolean;
}

const items = signal<Item[]>([
  { id: 1, label: "Erase the types", done: true },
  { id: 2, label: "Compile the JSX", done: true },
  { id: 3, label: "Reconcile a virtual tree", done: false },
]);

const count = signal(0);
const left = computed(() => items().filter((i) => !i.done).length);

function toggle(id: number): void {
  items.set(items().map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
}

/** A component is a function of its props, as it looks. */
function Row({ item }: { item: Item }) {
  return (
    <li class="flex items-center gap-3 border-b py-2 last:border-b-0">
      <input
        type="checkbox"
        class="size-4 accent-primary"
        checked={item.done}
        onChange={() => toggle(item.id)}
        aria-label={item.label}
      />
      <span class={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
    </li>
  );
}

function App() {
  return (
    <div class="mx-auto max-w-lg px-6 py-16">
      {Card({
        children: (
          <>
            {CardHeader({
              children: (
                <>
                  {CardTitle({ children: "JSX, served" })}
                  {CardDescription({
                    children:
                      "This file is .tsx. Nothing bundled it — the server compiled the " +
                      "elements against our own runtime, which builds DOM directly.",
                  })}
                </>
              ),
            })}
            {CardContent({
              children: (
                <div class="flex flex-col gap-4">
                  <ul id="items" class="text-sm">
                    {() => items().map((item) => <Row item={item} />)}
                  </ul>

                  <div class="flex items-center gap-3">
                    {Button({
                      children: "Count up",
                      onClick: () => count.set(count() + 1),
                    })}
                    <span class="text-sm text-muted-foreground">
                      pressed <strong id="count" class="text-foreground">{count}</strong> times
                    </span>
                  </div>

                  <div class="flex items-center gap-2 text-xs">
                    {Badge({ variant: "secondary", children: "left" })}
                    <span id="left">{left}</span>
                  </div>
                </div>
              ),
            })}
          </>
        ),
      })}
    </div>
  );
}

mount("#app", () => <App />);
