import * as React from "react"
import { cn } from "cn"

/**
 * A card with a toolbar: the controls for what is in it on top, a line, then what they control. One component, so
 * every list page has the same padding, gaps and line.
 */
function ToolbarCard({ toolbar, className, children, ...props }: React.ComponentProps<"div"> & { toolbar: React.ReactNode }) {
  return (
    <div data-slot="card" className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground", className)} {...props}>
      <div data-slot="toolbar-card-toolbar" className="flex flex-wrap items-center gap-2 border-b p-3">
        {toolbar}
      </div>
      {children}
    </div>
  )
}

export { ToolbarCard }
