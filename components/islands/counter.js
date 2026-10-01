/**
 * The island the rendered page carries.
 *
 * It is handed the props from the markup and returns a template; the element
 * it replaces was already on screen, sent as HTML by the server, so there is
 * nothing to wait for before the page is readable.
 */

import { signal } from "sluurp/reactive";
import { html, on } from "sluurp/ui";

export default function Counter({ start = 0 }) {
  const count = signal(start);
  return html`<button
    class="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-accent"
    ${on("click", () => count.update((n) => n + 1))}
    >Clicked ${count} times</button
  >`;
}
