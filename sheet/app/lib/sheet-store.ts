import { Sluurp } from "@sluurp/client"
import { live, liveRow } from "@sluurp/client/sync"
import type { SheetCell, SheetShape, SheetStore } from "@/lib/sheet"

type Row = SheetCell & { id: string; sheet: string; ref: string } & Record<string, unknown>

export interface CollectionSheetStore extends SheetStore {
  /** The rows have come from the server, or were kept here from last time. */
  ready: () => boolean
}

/** The sheet `sheet` in `collection` (fields: sheet, ref, formula, bold, format, renderer). */
export function sheetStore(collection: string, sheet: string, client: Sluurp = new Sluurp()): CollectionSheetStore {
  const cells = client.collection(collection)
  const SHAPE = "@shape"
  // A row's id from its sheet and reference: `demo`, `A1` → `demoa1000000000`.
  const idOf = (ref: string) => `${sheet}${ref === SHAPE ? "shape" : ref}`.toLowerCase().padEnd(15, "0").slice(0, 15)
  const all = live<Row>(cells as never, { filter: `sheet = "${sheet}"`, keep: true })
  const rows = new Map<string, () => Row | undefined>()
  const rowOf = (ref: string) => {
    let row = rows.get(ref)
    if (!row) rows.set(ref, (row = liveRow<Row>(cells as never, idOf(ref))))
    return row
  }
  const shapeRow = rowOf(SHAPE)
  const put = (ref: string, patch: Partial<Row>) => {
    const id = idOf(ref)
    const done = rowOf(ref)() ? cells.update(id, patch) : cells.create({ id, sheet, ref, formula: "", ...patch })
    done.catch((e: unknown) => console.error(e))
  }
  return {
    ready: () => all.ready() || all().length > 0,
    shape: () => {
      try {
        const f = shapeRow()?.formula
        return f ? (JSON.parse(f) as SheetShape) : undefined
      } catch {
        return undefined
      }
    },
    setShape: (shape) => put(SHAPE, { formula: JSON.stringify(shape) }),
    cell: (ref) => rowOf(ref),
    write: (ref, patch) => put(ref, patch),
  }
}
