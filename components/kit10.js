/**
 * The last four: the components that were only in the old library.
 *
 * Ported rather than dropped, because each does something the kit had no
 * answer for — and `sluurp-components.js` cannot be deleted until it has no
 * reason to exist.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Badge } from "sluurp/kit/badge.js";
import { Button } from "sluurp/kit/button.js";
import { Combobox } from "sluurp/kit/combobox.js";
import { FieldRow } from "sluurp/kit/field.js";
import { Input, Textarea } from "sluurp/kit/input.js";
import { NativeSelect } from "sluurp/kit/native-select.js";
import { page, section } from "./gallery.js";

const email = signal("");
const role = signal("teacher");
const person = signal(null);
const note = signal("");

/** A stand-in for a collection, slow enough to see the race guard working. */
const PEOPLE = [
  { value: "edna", label: "Edna Krabappel" },
  { value: "elizabeth", label: "Elizabeth Hoover" },
  { value: "seymour", label: "Seymour Skinner" },
  { value: "gary", label: "Gary Chalmers" },
  { value: "bart", label: "Bart Simpson", disabled: true },
];

const searches = signal(0);
const lookup = async (text) => {
  searches.update((n) => n + 1);
  // Deliberately variable, so an earlier request can land after a later one.
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 400));
  const needle = text.trim().toLowerCase();
  return needle
    ? PEOPLE.filter((p) => p.label.toLowerCase().includes(needle))
    : PEOPLE;
};

mount("#app", () =>
  page(
    "Kit X",
    "The four that were only in the old library.",
    html`
    ${section(
      "Field",
      "A label bound to a control, with its hint and its error attached rather than " +
        "merely nearby — a hint beside a control is not part of it, and a screen reader " +
        "reads past it. The asterisk is decorative; aria-required carries the meaning. " +
        "Type something without an @ and leave the box.",
      html`<div class="w-full max-w-sm">
        ${FieldRow({
          label: "Email",
          hint: "We will only use this to sign you in.",
          required: true,
          error: () => (email() && !email().includes("@") ? "That is not an email address" : ""),
          control: (id) =>
            Input({
              id,
              value: email,
              onInput: (event) => email.set(event.target.value),
            }),
        })}
      </div>`,
      { align: "start" },
    )}

    ${section(
      "Native select",
      "The element the browser already has. On a phone it shows the platform's own " +
        "wheel, and inside a form it has a value the form encodes — which a div with " +
        "role=listbox does not. Both selects exist on purpose.",
      html`<div class="w-full max-w-sm">
        ${FieldRow({
          label: "Role",
          control: (id) =>
            NativeSelect({
              id,
              value: role,
              options: [
                { value: "teacher", label: "Teacher" },
                { value: "guardian", label: "Guardian" },
                { value: "admin", label: "Administrator" },
                { value: "auditor", label: "Auditor", disabled: true },
              ],
            }),
        })}
      </div>
      <span class="text-xs text-muted-foreground"
        >Chose: <span class="font-medium text-foreground">${role}</span></span
      >`,
      { align: "start" },
    )}

    ${section(
      "Combobox",
      "A select you can type into, with the options coming from a function — so the " +
        "list can be longer than a page should send. The replies here are deliberately " +
        "variable, so an earlier one can land after a later one: only the newest search " +
        "is allowed to write, which is why the list never disagrees with the box.",
      html`<div class="flex w-full max-w-sm flex-col gap-3">
        ${FieldRow({
          label: "Assign to",
          hint: "Searches as you type.",
          control: (id) =>
            Combobox({
              id,
              value: person,
              options: lookup,
              labelOf: (v) => PEOPLE.find((p) => p.value === v)?.label ?? String(v),
              placeholder: "Nobody yet",
              onChange: (v) => person.set(v),
            }),
        })}
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          ${Badge({ variant: "secondary", children: "searches" })}
          <span>${searches}</span>
          ${Button({
            variant: "ghost",
            size: "sm",
            children: "Clear",
            onClick: () => person.set(null),
          })}
        </div>
      </div>`,
      { align: "start" },
    )}

    ${section(
      "Field, in a row",
      "The same component laid out for a control that belongs beside its label rather " +
        "than under it.",
      html`<div class="w-full max-w-sm">
        ${FieldRow({
          label: "Notes",
          hint: "Optional.",
          layout: "stack",
          control: (id) =>
            Textarea({
              id,
              value: note,
              onInput: (event) => note.set(event.target.value),
            }),
        })}
      </div>`,
      { align: "start" },
    )}
    `,
  ),
);
