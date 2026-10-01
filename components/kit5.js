/**
 * The fifth batch: menus opened three ways, and the rest of the inputs.
 *
 * The dropdown, the context menu and the menubar are the same panel with the
 * same rows, differing only in what opens them. Having them side by side is
 * the check that they still behave alike.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { ContextMenu } from "sluurp/kit/context-menu.js";
import { DropdownMenu } from "sluurp/kit/dropdown-menu.js";
import { InputOtp } from "sluurp/kit/input-otp.js";
import { Menubar } from "sluurp/kit/menubar.js";
import { ScrollArea } from "sluurp/kit/scroll-area.js";
import { Separator } from "sluurp/kit/separator.js";
import { Toaster, toast } from "sluurp/kit/sonner.js";
import { page, section } from "./gallery.js";

const bookmarks = signal(true);
const fullUrls = signal(false);
const profile = signal("edna");
const code = signal("");

const notifications = Toaster();

const VIEW_ITEMS = [
  { heading: true, label: "Appearance" },
  {
    label: "Show bookmarks",
    checked: bookmarks,
    shortcut: "⌘⇧B",
    onSelect: (next) => bookmarks.set(next),
  },
  { label: "Show full URLs", checked: fullUrls, onSelect: (next) => fullUrls.set(next) },
  { separator: true },
  { heading: true, label: "Profile" },
  { label: "Edna", selected: computed(() => profile() === "edna"), onSelect: () => profile.set("edna") },
  { label: "Seymour", selected: computed(() => profile() === "seymour"), onSelect: () => profile.set("seymour") },
];

mount("#app", () =>
  page(
    "Kit V",
    "Menus opened three ways, and the rest of the inputs.",
    html`
    ${section(
      "Menubar",
      "Once one menu is open, moving along the bar opens the next without a second click. " +
        "That is what makes it a menubar rather than a row of dropdowns, and it is the " +
        "behaviour people have from every desktop application.",
      Menubar({
        menus: [
          {
            label: "File",
            items: [
              { label: "New Tab", shortcut: "⌘T" },
              { label: "New Window", shortcut: "⌘N" },
              { label: "New Incognito Window", disabled: true },
              { separator: true },
              { label: "Print…", shortcut: "⌘P" },
            ],
          },
          {
            label: "Edit",
            items: [
              { label: "Undo", shortcut: "⌘Z" },
              { label: "Redo", shortcut: "⇧⌘Z" },
              { separator: true },
              { label: "Find…", shortcut: "⌘F" },
            ],
          },
          { label: "View", items: VIEW_ITEMS },
        ],
      }),
    )}

    ${section(
      "Context menu",
      "Positioned at the pointer rather than beside a trigger — the one thing that makes " +
        "it different from a dropdown. Long-press opens it on touch, where there is no " +
        "right button.",
      ContextMenu({
        items: [
          { label: "Back", shortcut: "⌘[" },
          { label: "Forward", shortcut: "⌘]", disabled: true },
          { label: "Reload", shortcut: "⌘R" },
          { separator: true },
          { label: "Show bookmarks", checked: bookmarks, onSelect: (v) => bookmarks.set(v) },
          { separator: true },
          { label: "Inspect" },
        ],
        children: html`<div
          class="flex h-32 w-72 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
        >Right-click here</div>`,
      }),
    )}

    ${section(
      "Checkable rows",
      "A checkbox or radio row does not close the menu: the point of it is to set several " +
        "things, and closing after each one means opening it again.",
      html`
        ${DropdownMenu({
          trigger: Button({ children: "View", variant: "outline" }),
          items: VIEW_ITEMS,
        })}
        <span class="text-xs text-muted-foreground"
          >${computed(
            () =>
              `bookmarks ${bookmarks() ? "on" : "off"} · urls ${fullUrls() ? "on" : "off"} · ${profile()}`,
          )}</span
        >
      `,
    )}

    ${section(
      "Sonner",
      "A singleton, which is the whole point: a toast is raised from an event handler, a " +
        "network failure, a socket message — places with no view to render into. The stack " +
        "collapses to one with the rest peeking behind and expands when the pointer arrives, " +
        "because an expanded stack of five covers a third of the screen.",
      html`
        ${Button({
          children: "Default",
          variant: "outline",
          onClick: () =>
            toast("Scheduled: catch up", { description: "Friday, February 10 at 5:57 PM" }),
        })}
        ${Button({
          children: "Success",
          variant: "outline",
          onClick: () => toast.success("Permission slip returned"),
        })}
        ${Button({
          children: "Error",
          variant: "outline",
          onClick: () =>
            toast.error("Out of space", {
              description: "This project is using all 250 MB of its allowance.",
            }),
        })}
        ${Button({
          children: "With an action",
          variant: "outline",
          onClick: () =>
            toast("Absence recorded", {
              description: "Bart Simpson, Friday morning",
              action: { label: "Undo", onClick: () => toast.success("Undone") },
            }),
        })}
        ${Button({
          children: "Promise",
          variant: "outline",
          onClick: () =>
            toast.promise(new Promise((resolve) => setTimeout(resolve, 1800)), {
              loading: "Uploading trip-notes.txt…",
              success: "Uploaded",
              error: "Upload failed",
            }),
        })}
        ${Button({
          children: "Three at once",
          variant: "ghost",
          onClick: () => {
            toast("First");
            toast("Second");
            toast("Third — hover the stack to expand it");
          },
        })}
      `,
    )}

    ${section(
      "One-time code",
      "The boxes are a picture. Underneath is one real input covering them, carrying " +
        "autocomplete=one-time-code — which is what lets a phone offer the code straight " +
        "from the message, and is the whole reason to use this pattern.",
      html`
        ${InputOtp({
          length: 6,
          groups: [3, 3],
          value: code,
          onChange: (v) => code.set(v),
          onComplete: (v) => toast.success("Code entered", { description: v }),
        })}
        <span class="text-xs text-muted-foreground">${computed(() => code() || "—")}</span>
      `,
    )}

    ${section(
      "Scroll area",
      "The element scrolls natively — wheel, trackpad momentum, keyboard and find-in-page " +
        "all still work — and only the scrollbar is drawn. Taking over scrolling itself is " +
        "how a page stops responding to Page Down.",
      ScrollArea({
        className: "h-48 w-64 rounded-md border",
        children: html`<div class="p-4">
          <h4 class="mb-3 text-sm font-medium leading-none">Tags</h4>
          ${Array.from(
            { length: 24 },
            // A rule *between* the rows, so the last one does not sit a
            // hair above the container's own border and read as a doubled
            // edge.
            (_, i) => html`<div class="text-sm">
              ${i === 0 ? "" : Separator({})}
              <div class="py-2">Tag ${String(24 - i)}</div>
            </div>`,
          )}
        </div>`,
      }),
    )}
    `,
  ),
);

// The stack lives outside the page's own column: it is fixed to the window,
// not to the content.
mount("#toasts", () => notifications.view());
