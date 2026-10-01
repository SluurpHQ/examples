/**
 * The sixth batch: searching and dates.
 *
 * Command and calendar are the two components that are mostly keyboard.
 * Neither can be judged from a screenshot, so this page exists to be driven.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { Calendar } from "sluurp/kit/calendar.js";
import { Command, CommandDialog } from "sluurp/kit/command.js";
import { DatePicker } from "sluurp/kit/date-picker.js";
import { Toaster, toast } from "sluurp/kit/sonner.js";
import { page, section } from "./gallery.js";

const chosen = signal(null);
const picked = signal(null);
const stay = signal({ from: null, to: null });
const notifications = Toaster();

const ITEMS = [
  { heading: true, label: "Suggestions" },
  { value: "calendar", label: "Calendar", shortcut: "⌘C", keywords: "date day month" },
  { value: "emoji", label: "Search emoji", keywords: "icon face" },
  { value: "launch", label: "Launch", keywords: "start run" },
  { separator: true },
  { heading: true, label: "Settings" },
  { value: "profile", label: "Profile", shortcut: "⌘P" },
  { value: "billing", label: "Billing", shortcut: "⌘B" },
  { value: "new-project", label: "New Project", keywords: "create add" },
  { value: "open-panel", label: "Open Panel", keywords: "show" },
  { value: "gone", label: "Unavailable", disabled: true },
];

const palette = CommandDialog({
  items: ITEMS,
  shortcut: "k",
  onSelect: (value) => toast.success("Chose " + value),
});

mount("#app", () =>
  page(
    "Kit VI",
    "Searching and dates — the two that are mostly keyboard.",
    html`
    ${section(
      "Command",
      "Subsequence matching — every letter in order, gaps allowed — so 'np' finds " +
        "'New Project', and scoring puts it above 'Open Panel' because both letters " +
        "start a word. Focus stays in the input the whole " +
        "time and the highlighted row is named by aria-activedescendant — the only " +
        "arrangement where typing and arrowing both work.",
      html`<div class="w-full max-w-md rounded-lg border shadow-md">
        ${Command({
          items: ITEMS,
          autoFocus: false,
          onSelect: (value) => chosen.set(value),
        })}
      </div>
      <span class="text-xs text-muted-foreground"
        >Chose: <span class="font-medium text-foreground"
          >${computed(() => chosen() ?? "—")}</span
        ></span
      >`,
      { align: "start" },
    )}

    ${section(
      "Command palette",
      "The same list in a dialog. Press ⌘K or Ctrl-K anywhere on this page.",
      Button({
        children: "Open palette",
        variant: "outline",
        onClick: () => palette.open(),
      }),
    )}

    ${section(
      "Calendar",
      "A real grid, so a screen reader says 'week 3, Wednesday 14' rather than reading " +
        "forty-two numbers. Arrows move by day and week, Page Up and Page Down by month, " +
        "Home and End to the ends of the week. Only the focused day is tabbable.",
      html`<div class="rounded-md border">
        ${Calendar({
          value: picked,
          onChange: (d) => picked.set(d),
          disabled: (d) => d.getDay() === 0,
        })}
      </div>
      <span class="text-xs text-muted-foreground"
        >Picked:
        <span class="font-medium text-foreground"
          >${computed(() =>
            picked() ? new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(picked()) : "—",
          )}</span
        ></span
      >`,
      { align: "start" },
    )}

    ${section(
      "Date picker",
      "The button says the date in the reader's format, not the author's — '03/04' is " +
        "two different days either side of the Atlantic. Choosing a day closes the popover.",
      DatePicker({ value: picked, onChange: (d) => picked.set(d) }),
    )}

    ${section(
      "Date range",
      "While a range is half-made the span under the pointer is drawn as though it were " +
        "chosen — without it you pick the second end blind. The arrows move the preview " +
        "too. A second click before the start reverses the range rather than refusing it, " +
        "and the popover closes when the range is complete, not when a day is clicked.",
      html`${DatePicker({
        mode: "range",
        value: stay,
        onChange: (r) => stay.set(r),
      })}
      <span class="text-xs text-muted-foreground"
        >Range:
        <span class="font-medium text-foreground"
          >${computed(() => {
            const at = stay();
            if (!at?.from) return "—";
            const show = (d) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
            return at.to ? `${show(at.from)} → ${show(at.to)}` : `${show(at.from)} → …`;
          })}</span
        ></span
      >`,
      { align: "start" },
    )}
    `,
  ),
);

mount("#toasts", () => notifications.view());
