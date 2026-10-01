/**
 * The component gallery.
 *
 * One of each, with enough around them to see the behaviour rather than only
 * the appearance — a menu inside a scrolling panel, a menu near the bottom of
 * the window, a dialog with something focusable behind it. Those are the
 * cases a component library gets wrong, and they are invisible in a screenshot
 * of the thing sitting alone in the middle of a page.
 */

import { signal } from "sluurp/reactive";
import { html, mount, on } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { Dialog } from "sluurp/kit/dialog.js";
import { DropdownMenu } from "sluurp/kit/dropdown-menu.js";
import { page, section } from "./gallery.js";

const confirming = signal(false);
const chosen = signal("nothing yet");

const MENU_ITEMS = [
  { label: "Profile", shortcut: "⇧⌘P", onSelect: () => chosen.set("Profile") },
  { label: "Billing", shortcut: "⌘B", onSelect: () => chosen.set("Billing") },
  { label: "Settings", shortcut: "⌘S", onSelect: () => chosen.set("Settings") },
  { separator: true },
  { label: "Team", onSelect: () => chosen.set("Team") },
  { label: "Invite users", disabled: true },
  { separator: true },
  { label: "Log out", shortcut: "⇧⌘Q", onSelect: () => chosen.set("Log out") },
];

mount("#app", () =>
  page(
    "Kit",
    "Tailwind class strings, Sluurp primitives, no build step.",
    html`
    ${section(
      "Button",
      "Six variants and four sizes, from the same class strings as upstream.",
      html`
        ${Button({ children: "Default" })}
        ${Button({ children: "Secondary", variant: "secondary" })}
        ${Button({ children: "Destructive", variant: "destructive" })}
        ${Button({ children: "Outline", variant: "outline" })}
        ${Button({ children: "Ghost", variant: "ghost" })}
        ${Button({ children: "Link", variant: "link" })}
        ${Button({ children: "Small", size: "sm", variant: "outline" })}
        ${Button({ children: "Large", size: "lg", variant: "outline" })}
        ${Button({ children: "Disabled", disabled: true })}
      `,
    )}

    ${section(
      "Dropdown menu",
      "Arrow keys, Home and End, type-to-jump, Escape returns focus to the trigger. " +
        "Hovering moves focus, so the pointer and the keyboard never disagree about which " +
        "item is current.",
      html`
        ${DropdownMenu({
          trigger: Button({ children: "Open menu", variant: "outline" }),
          items: MENU_ITEMS,
        })}
        <span class="text-xs text-muted-foreground"
          >Last chosen: <span class="font-medium text-foreground" id="chosen">${chosen}</span></span
        >
      `,
    )}

    ${section(
      "Clipped by an ancestor",
      "The panel is rendered at the end of the body, so a card with overflow:hidden " +
        "cannot cut it off — which is what happens to every menu written where it is " +
        "declared.",
      html`
        <div class="h-24 w-64 overflow-hidden rounded-lg border border-border p-4">
          <p class="mb-2 text-xs text-muted-foreground">overflow: hidden</p>
          ${DropdownMenu({
            trigger: Button({ children: "Menu", variant: "outline", size: "sm" }),
            items: MENU_ITEMS.slice(0, 4),
          })}
        </div>
      `,
    )}

    ${section(
      "Dialog",
      "The page behind is inert to a screen reader, the keyboard cannot leave, Escape " +
        "closes, focus returns to the Button, and the page neither scrolls nor jumps " +
        "sideways as the scrollbar goes.",
      html`
        ${Button({
          children: "Delete file",
          variant: "destructive",
          onClick: () => confirming.set(true),
        })}
        <a href="#" class="text-sm underline underline-offset-4"
          >A focusable thing behind the dialog</a
        >
        ${Dialog({
          open: confirming,
          title: "Delete trip-notes.txt?",
          description:
            "This cannot be undone. The file and its bytes go, and the space it was " +
            "using is released.",
          footer: html`
            ${Button({
              children: "Cancel",
              variant: "outline",
              onClick: () => confirming.set(false),
            })}
            ${Button({
              children: "Delete",
              variant: "destructive",
              onClick: () => confirming.set(false),
            })}
          `,
        })}
      `,
    )}

    ${section(
      "Near the bottom",
      "This one is far enough down that opening downward would put it off the screen, " +
        "so it flips — and reports how much room it has, so a long menu scrolls rather " +
        "than overflowing.",
      html`
        <div class="h-[60vh]"></div>
        ${DropdownMenu({
          trigger: Button({ children: "Opens upward", variant: "outline" }),
          items: MENU_ITEMS,
        })}
      `,
    )}
    `,
  ),
);
