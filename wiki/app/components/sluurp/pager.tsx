import * as React from "react"

import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

/** The pages to show: the first, the last, the current and one either side of it, gaps as "…". */
export function pagesAround(page: number, pages: number): (number | "…")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const out: (number | "…")[] = []
  let last = 0
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - last > 1) out.push("…")
    out.push(n)
    last = n
  }
  return out
}

/** Pages by number, with Previous and Next, on shadcn's Pagination. */
function Pager({ page, pages, onPageChange, className }: { page: number; pages: number; onPageChange: (page: number) => void; className?: string }) {
  const go = (n: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (n >= 1 && n <= pages && n !== page) onPageChange(n)
  }
  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={go(page - 1)} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : undefined} />
        </PaginationItem>
        {pagesAround(page, pages).map((n, i) => (
          <PaginationItem key={i}>
            {n === "…" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href="#" isActive={n === page} onClick={go(n)} className="tabular-nums">
                {n}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href="#" onClick={go(page + 1)} aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-50" : undefined} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export { Pager }
