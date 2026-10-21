import * as React from "react"
import { cn } from "cn"
import { SearchIcon } from "lucide-react"

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

/** A search box: a field with a magnifier inside it, named by what it says, the same everywhere. */
function SearchInput({ label, className, ...props }: Omit<React.ComponentProps<"input">, "type"> & { label: string }) {
  return (
    <InputGroup data-slot="search-input" className={cn("min-w-0 bg-background", className)}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput type="search" spellCheck={false} placeholder={label} aria-label={label} {...props} />
    </InputGroup>
  )
}

export { SearchInput }
