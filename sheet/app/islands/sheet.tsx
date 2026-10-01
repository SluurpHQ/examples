/**
 * A spreadsheet everybody edits at once: the kit's `Spreadsheet`, its cells
 * kept in a collection over sync, everybody's pointer over it.
 *
 * The component knows nothing of sync or of anybody else. It is given:
 *
 * - a store whose cells are rows of `cells` (`{ sheet, ref, formula, bold }`),
 *   each read by itself (`liveRow`), so a cell is worked out again only
 *   when a cell it reads changes, in every browser;
 * - what others have chosen, from live cursors (`sluurp/cursors`), which
 *   also carry what is chosen here, and each person's pointer, in their
 *   colour, over the sheet.
 *
 */
import { Sluurp } from "sluurp";
import { signal } from "sluurp/reactive";
import { liveCursors, type Other } from "sluurp/cursors";
import { useClasses } from "sluurp/classes";
import { Spreadsheet, type SheetArea, type SheetPresence } from "sluurp/kit/spreadsheet.js";
import { sheetStore } from "sluurp/kit/sheet-store.js";

/**
 * Where the cells are, said by whoever places it — nothing assumed:
 * `collection`, any collection with the fields `sheet`, `ref`, `formula`
 * and `bold` (see `schema.json`), and `sheet`, which of its sheets. `name`
 * is the one beside this person's pointer.
 */
/** Minutes to the next reset, counting down, when a page resets the sheet (`resets`, in minutes). */
function countdown(every: number) {
  const left = signal("");
  const tick = () => {
    const ms = every * 60_000 - (Date.now() % (every * 60_000));
    left.set(`${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`);
  };
  tick();
  setInterval(tick, 1000);
  return left;
}

export default function Sheet({ collection, sheet, name, resets }: { collection: string; sheet: string; name?: string; resets?: number }) {
  const SHEET = sheet;
  const who = name;
  const sluurp = new Sluurp();
  // The cells, rows of the collection, kept current and written back (the kit's sheetStore).
  const store = sheetStore(collection, SHEET, sluurp);

  // What is chosen here, for the others; theirs, from them.
  let mine: SheetArea = { c0: 0, c1: 0, r0: 0, r1: 0 };
  let holds: string[] = [];
  let since = 0;
  const others = signal<SheetPresence[]>([]);
  const evaluations: Record<string, number> = {};
  (window as unknown as { evaluations: typeof evaluations }).evaluations = evaluations;

  return (
    <div>
      <Spreadsheet
        store={store}
        widthsKey={`sheet.widths.${SHEET}`}
        waiting={() => !store.ready()}
        others={others}
        onSelect={(area) => (mine = area)}
        onHold={(refs, at) => ((holds = refs), (since = at))}
        onEvaluate={(ref) => (evaluations[ref] = (evaluations[ref] ?? 0) + 1)}
        // A way of showing a cell, of this app's own: a bar as long as its
        // value, from 0 to 1 — =SUM(A1:A3)/20, say. Chosen from a cell's menu.
        renderers={{
          // A bar from min to max (0 and 1 unless the cell says: `progress 0 100 bg-emerald-500`), in any Tailwind colour.
          progress: {
            options: "min max colour",
            render: (value, _ref, _sheet, [min = "0", max = "1", colour = "bg-blue-600"]) => {
              const [lo, hi] = [Number(min) || 0, Number(max) || 1];
              const share = Math.max(0, Math.min(1, ((Number(value) || 0) - lo) / (hi - lo || 1)));
              return (
                <div class="mx-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={String(lo)} aria-valuemax={String(hi)} aria-valuenow={String(Number(value) || 0)}>
                  <div
                    class={`h-full rounded-full ${colour}`}
                    style={`width:${Math.round(share * 1000) / 10}%`}
                    // Its colour styled where it is drawn, once it is: the page, or an island's shadow root.
                    ref={(el: HTMLElement) => queueMicrotask(() => useClasses(colour, el))}
                  ></div>
                </div>
              );
            },
          },
        }}
        classes={useClasses}
        onTable={(table) =>
          liveCursors(`${collection}:*`, {
            over: table,
            client: sluurp,
            name: who,
            state: () => ({ ...mine, holds, since }),
            onState: (all: Other[]) =>
              others.set(all.map((o) => ({ id: o.id, name: o.name, color: o.color, area: o.state as SheetArea, ...(o.state as { holds?: string[]; since?: number }) }))),
          })
        }
      />
      <p class="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {resets ? <span class="mr-auto w-full tabular-nums sm:w-auto">Resetting in {countdown(resets)}</span> : ""}
        Formulas: a number, or
        {["=A1*2", "=SUM(A1:A3)", '=IF(A1>2, "big", "small")'].map((f) => (
          <code class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{f}</code>
        ))}
      </p>
    </div>
  );
}
