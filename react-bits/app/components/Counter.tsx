import { useState, type ReactNode } from "react";

export function Counter({ label, children }: { label: string; children?: ReactNode }) {
  const [count, setCount] = useState(0);
  return (
    <button className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => setCount(count + 1)}>
      {label} {count} {children}
    </button>
  );
}
