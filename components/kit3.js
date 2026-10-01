/**
 * The third batch: everything that floats.
 *
 * Tooltip, popover, hover card, sheet, alert dialog — five components that
 * differ in what is inside them and when they open, and share everything
 * else. Which is the thing worth checking here: that they behave the same
 * way as each other, because they are the same code.
 */

import { signal } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { AlertDialog } from "sluurp/kit/alert-dialog.js";
import { Avatar } from "sluurp/kit/avatar.js";
import { Button } from "sluurp/kit/button.js";
import { Card, CardHeader, CardTitle, CardContent } from "sluurp/kit/card.js";
import { HoverCard } from "sluurp/kit/hover-card.js";
import { Input } from "sluurp/kit/input.js";
import { Label } from "sluurp/kit/label.js";
import { Popover } from "sluurp/kit/popover.js";
import { Separator } from "sluurp/kit/separator.js";
import { Sheet } from "sluurp/kit/sheet.js";
import { Tooltip } from "sluurp/kit/tooltip.js";
import { page, section } from "./gallery.js";

const sheetOpen = signal(false);
const confirmOpen = signal(false);
const outcome = signal("nothing yet");

mount("#app", () =>
  page(
    "Kit III",
    "Everything that floats.",
    html`
    ${section(
      "Tooltip",
      "Opens on focus as well as hover, so it exists for a keyboard. Escape closes it " +
        "without moving focus. The delay is on opening only — a row of icon buttons should " +
        "not flash as the pointer crosses it, and a tooltip that lingers covers what you " +
        "moved to read.",
      html`
        ${Tooltip({ label: "Add to library", children: Button({ children: "Hover me", variant: "outline" }) })}
        ${Tooltip({ label: "Opens above", side: "top", children: Button({ children: "Top", variant: "ghost" }) })}
        ${Tooltip({ label: "Opens to the right", side: "right", children: Button({ children: "Right", variant: "ghost" }) })}
        <span class="text-xs text-muted-foreground">Tab to them — they open on focus too.</span>
      `,
    )}

    ${section(
      "Popover",
      "Has contents somebody interacts with, so focus goes into it and is kept there. " +
        "Escape closes and returns focus to the trigger; a click elsewhere closes and " +
        "leaves focus where the click put it.",
      Popover({
        trigger: Button({ children: "Open popover", variant: "outline" }),
        children: html`
          <div class="grid gap-3">
            <div class="space-y-1">
              <h4 class="font-medium leading-none">Dimensions</h4>
              <p class="text-sm text-muted-foreground">Set the size of the layer.</p>
            </div>
            <div class="grid gap-2">
              <div class="grid grid-cols-3 items-center gap-2">
                ${Label({ htmlFor: "width", children: "Width" })}
                ${Input({ id: "width", value: "100%", className: "col-span-2 h-8" })}
              </div>
              <div class="grid grid-cols-3 items-center gap-2">
                ${Label({ htmlFor: "height", children: "Height" })}
                ${Input({ id: "height", value: "25px", className: "col-span-2 h-8" })}
              </div>
            </div>
          </div>
        `,
      }),
    )}

    ${section(
      "Hover card",
      "Carries content rather than a Label, so it is not announced as a tooltip. The " +
        "close delay is what makes its contents reachable — a card that vanishes when the " +
        "pointer leaves the trigger cannot be moved into.",
      HoverCard({
        openDelay: 200,
        trigger: html`<a href="#" class="text-sm font-medium underline underline-offset-4"
          >@ednakrabappel</a
        >`,
        children: html`
          <div class="flex gap-3">
            ${Avatar({ fallback: "EK" })}
            <div class="space-y-1">
              <h4 class="text-sm font-semibold">Edna Krabappel</h4>
              <p class="text-sm">Teaches 4A. Has opinions about permission slips.</p>
              <p class="text-xs text-muted-foreground">Joined September 2019</p>
            </div>
          </div>
        `,
      }),
    )}

    ${section(
      "Sheet",
      "A dialog that comes in from an edge. The same component underneath — focus " +
        "trapped, page inert, Escape, scroll locked — with a different animation.",
      html`
        ${Button({ children: "Open sheet", variant: "outline", onClick: () => sheetOpen.set(true) })}
        ${Sheet({
          open: sheetOpen,
          side: "right",
          title: "Edit profile",
          description: "Make changes here. Nothing is saved until you say so.",
          children: html`
            <div class="grid gap-4 py-4">
              <div class="grid gap-1.5">
                ${Label({ htmlFor: "sheet-name", children: "Name" })}
                ${Input({ id: "sheet-name", value: "Edna Krabappel" })}
              </div>
              <div class="grid gap-1.5">
                ${Label({ htmlFor: "sheet-phone", children: "Phone" })}
                ${Input({ id: "sheet-phone", placeholder: "555-0113" })}
              </div>
            </div>
          `,
          footer: Button({ children: "Save changes", onClick: () => sheetOpen.set(false) }),
        })}
      `,
    )}

    ${section(
      "Alert dialog",
      "Cannot be dismissed by clicking away or by Escape. That is right for exactly one " +
        "thing: a question whose answer is destructive, where dismissing by accident and " +
        "dismissing on purpose have to be told apart.",
      html`
        ${Button({
          children: "Delete account",
          variant: "destructive",
          onClick: () => confirmOpen.set(true),
        })}
        <span class="text-xs text-muted-foreground">Last answer: <span class="font-medium text-foreground">${outcome}</span></span>
        ${AlertDialog({
          open: confirmOpen,
          destructive: true,
          title: "Are you absolutely sure?",
          description:
            "This permanently deletes the account and everything in it. There is no undo " +
            "and no copy kept anywhere.",
          action: "Delete account",
          onAction: () => outcome.set("deleted"),
          onCancel: () => outcome.set("cancelled"),
        })}
      `,
    )}
    `,
  ),
);
