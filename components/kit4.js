/**
 * The fourth batch: choosing, dragging, paging.
 *
 * Select is the one worth driving hardest. It is the component every design
 * system replaces and the one every replacement half-finishes, because a
 * native `<select>` gives away a great deal for free and a div does not.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Badge } from "sluurp/kit/badge.js";
import { Button } from "sluurp/kit/button.js";
import { Collapsible } from "sluurp/kit/collapsible.js";
import { Label } from "sluurp/kit/label.js";
import { Pagination } from "sluurp/kit/pagination.js";
import { Select } from "sluurp/kit/select.js";
import { Separator } from "sluurp/kit/separator.js";
import { Slider } from "sluurp/kit/slider.js";
import { ToggleGroup } from "sluurp/kit/toggle-group.js";
import { page, section } from "./gallery.js";

const fruit = signal(undefined);
const timezone = signal("gmt");
const volume = signal(35);
const align = signal("left");
const style = signal([]);
const page = signal(4);
const open = signal(false);

mount("#app", () =>
  page(
    "Kit IV",
    "Choosing, dragging, paging.",
    html`
    ${section(
      "Select",
      "One tab stop. Arrows move the active option without choosing it, Enter chooses, " +
        "Escape closes without choosing, typing jumps. Focus stays on the trigger and the " +
        "active option is named by aria-activedescendant, which is what lets typing keep " +
        "reaching it.",
      html`
        <div class="w-56">
          ${Label({ htmlFor: "fruit", children: "Fruit" })}
          ${Select({
            id: "fruit",
            value: fruit,
            onChange: (v) => fruit.set(v),
            placeholder: "Pick one",
            options: [
              { heading: true, label: "Citrus" },
              { value: "orange", label: "Orange" },
              { value: "lemon", label: "Lemon" },
              { separator: true },
              { heading: true, label: "Berries" },
              { value: "strawberry", label: "Strawberry" },
              { value: "blueberry", label: "Blueberry" },
              { value: "gooseberry", label: "Gooseberry", disabled: true },
            ],
          })}
        </div>
        <div class="w-56">
          ${Label({ htmlFor: "tz", children: "Timezone" })}
          ${Select({
            id: "tz",
            value: timezone,
            onChange: (v) => timezone.set(v),
            options: [
              { value: "gmt", label: "Greenwich Mean Time" },
              { value: "cet", label: "Central European Time" },
              { value: "eet", label: "Eastern European Time" },
              { value: "est", label: "Eastern Standard Time" },
              { value: "pst", label: "Pacific Standard Time" },
            ],
          })}
        </div>
        <span class="text-xs text-muted-foreground"
          >Chosen: <span class="font-medium text-foreground">${computed(() => fruit() ?? "—")}</span></span
        >
      `,
    )}

    ${section(
      "Slider",
      "Arrows step, Page Up and Page Down take a larger step, Home and End go to the ends. " +
        "Dragging uses pointer capture, so the pointer leaving the four-pixel track does not " +
        "drop the drag.",
      html`
        <div class="w-72">
          ${Slider({
            value: volume,
            onChange: (v) => volume.set(v),
            ariaLabel: "Volume",
            max: 100,
            step: 1,
          })}
        </div>
        <span class="w-10 text-sm tabular-nums">${volume}</span>
      `,
    )}

    ${section(
      "Toggle group",
      "Single is a radio group wearing buttons; multiple is a row of checkboxes wearing " +
        "buttons. The roles differ, which is the difference between a screen reader saying " +
        "'one of three' and saying 'pressed'.",
      html`
        <div class="flex flex-col gap-3">
          ${ToggleGroup({
            type: "single",
            variant: "outline",
            value: align,
            onChange: (v) => align.set(v ?? "left"),
            items: [
              { value: "left", label: "Align left", children: "Left" },
              { value: "center", label: "Align centre", children: "Centre" },
              { value: "right", label: "Align right", children: "Right" },
            ],
          })}
          ${ToggleGroup({
            type: "multiple",
            value: style,
            onChange: (v) => style.set(v),
            items: [
              { value: "bold", label: "Bold", children: "B" },
              { value: "italic", label: "Italic", children: "I" },
              { value: "underline", label: "Underline", children: "U" },
            ],
          })}
          <span class="text-xs text-muted-foreground"
            >${computed(() => `${align()} · ${style().join(", ") || "none"}`)}</span
          >
        </div>
      `,
    )}

    ${section(
      "Collapsible",
      "One thing that opens, with no group around it — the accordion's machinery without " +
        "the accordion.",
      html`<div class="w-full max-w-sm">
        ${Collapsible({
          open,
          onChange: (v) => open.set(v),
          className: "space-y-2",
          trigger: html`<span class="${"text-sm font-semibold"}">@ednakrabappel starred 3 repositories</span>`,
          children: html`<div class="space-y-2 pt-2">
            <div class="rounded-md border px-4 py-3 font-mono text-sm">sluurp</div>
            <div class="rounded-md border px-4 py-3 font-mono text-sm">my-app</div>
            <div class="rounded-md border px-4 py-3 font-mono text-sm">typeset</div>
          </div>`,
        })}
      </div>`,
    )}

    ${section(
      "Pagination",
      "Links rather than buttons, because a page is a place: it has a URL, it can be " +
        "opened in a new tab and it can be bookmarked. At most seven slots, with an " +
        "ellipsis for what is skipped.",
      html`<div class="w-full">
        ${Pagination({ page, pages: 24, onSelect: (n) => page.set(n) })}
        <p class="mt-3 text-center text-xs text-muted-foreground">
          Page <span class="font-medium text-foreground">${page}</span> of 24
        </p>
      </div>`,
    )}
    `,
  ),
);
