import { signal } from "sluurp/reactive";
import { Button } from "sluurp/kit/button.js";

export default function Counter() {
  const count = signal(0);
  return (
    <div class="flex items-center gap-3">
      <Button variant="outline" onClick={() => count.set(count() + 1)}>Add one</Button>
      <span class="tabular-nums">{count}</span>
    </div>
  );
}
