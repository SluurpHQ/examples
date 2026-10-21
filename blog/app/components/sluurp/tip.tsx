import * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/** A tooltip on one element, in one line: `<Tip label="Zoom in"><Button …/></Tip>`. With no label, the element alone. */
function Tip({ label, side, children }: { label: React.ReactNode; side?: "top" | "right" | "bottom" | "left"; children: React.ReactElement }) {
  if (label === null || label === undefined || label === false || label === "") return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )
}

export { Tip }
