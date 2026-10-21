import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={() => setCount((n) => n + 1)}>Add one</Button>
      <span className="tabular-nums">{count}</span>
    </div>
  );
}
