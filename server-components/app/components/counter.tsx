"use client";
// Solid-style: it runs once; only what reads `count` updates. The Button is shadcn's, React's, used as is.
import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";

export function Counter(props: { start: number }) {
  const [count, setCount] = createSignal(props.start);
  return (
    <p className="counter">
      Clicked <b>{count()}</b> times <Button onClick={() => setCount(count() + 1)}>Add one</Button>
    </p>
  );
}
