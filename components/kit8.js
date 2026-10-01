/**
 * The eighth batch: navigation and forms.
 *
 * Both are mostly about timing — when a panel is allowed to open, when an
 * error is allowed to appear. Neither shows in a screenshot.
 */

import { computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { Form } from "sluurp/kit/form.js";
import { Input, Textarea } from "sluurp/kit/input.js";
import { NavigationMenu, NavigationMenuLink } from "sluurp/kit/navigation-menu.js";
import { Switch } from "sluurp/kit/switch.js";
import { page, section } from "./gallery.js";

const signup = Form({
  values: { email: "", about: "", updates: false },
  validate: {
    email: (v) =>
      !v ? "An email address is required" : v.includes("@") ? null : "That is not an email address",
    about: (v) => (v.length > 120 ? "Keep it under 120 characters" : null),
  },
  onSubmit: (values) => {
    submitted.value = values;
  },
});

const submitted = { value: null };

mount("#app", () =>
  page(
    "Kit VIII",
    "Navigation and forms — both are mostly about timing.",
    html`
    ${section(
      "Navigation menu",
      "A nav holding a list, not a menu: a screen reader should say 'navigation' rather " +
        "than 'menu, 3 items' for a set of links. All the panels share one viewport that " +
        "animates to the size of whichever is open, because two differently-sized boxes " +
        "snapping past each other reads as two things rather than one thing changing. " +
        "Hover waits before the first panel opens and not at all between panels; leaving " +
        "has a grace period, so the diagonal path down into a panel does not close it.",
      html`<div class="flex min-h-[360px] w-full items-start justify-center">
        ${NavigationMenu({
          items: [
            {
              label: "Products",
              content: html`<ul class="grid w-[400px] gap-2 p-2 md:grid-cols-2">
                ${NavigationMenuLink({
                  href: "#",
                  title: "Analytics",
                  children: "Numbers about the numbers.",
                })}
                ${NavigationMenuLink({
                  href: "#",
                  title: "Storage",
                  children: "Files, sharded on disk, with a quota.",
                })}
                ${NavigationMenuLink({
                  href: "#",
                  title: "Realtime",
                  children: "Sockets that know who is connected.",
                })}
                ${NavigationMenuLink({
                  href: "#",
                  title: "Auth",
                  children: "Rules that compile to SQL.",
                })}
              </ul>`,
            },
            {
              label: "Company",
              content: html`<ul class="grid w-[260px] gap-2 p-2">
                ${NavigationMenuLink({ href: "#", title: "About" })}
                ${NavigationMenuLink({ href: "#", title: "Careers" })}
                ${NavigationMenuLink({ href: "#", title: "Contact" })}
              </ul>`,
            },
            { label: "Pricing", href: "#pricing" },
          ],
        })}
      </div>`,
    )}

    ${section(
      "Form",
      "A field stays quiet until it has been left, because telling somebody their email " +
        "is invalid when they have typed 'a' is telling them something they know. Once a " +
        "message is on screen it re-checks on every keystroke, so the fix is visible the " +
        "moment it happens. A failed submit puts focus on the first field that failed.",
      html`<div class="flex w-full max-w-sm flex-col gap-4">
        ${signup.view(html`
          ${signup.field({
            name: "email",
            label: "Email",
            description: "We will only use this to sign you in.",
            control: ({ setValue, ...props }) => Input({ ...props, type: "email" }),
          })}
          ${signup.field({
            name: "about",
            label: "About",
            description: "A sentence or two, at most 120 characters.",
            control: ({ setValue, ...props }) => Textarea(props),
          })}
          ${signup.field({
            name: "updates",
            label: "Product updates",
            description: "Occasional notes about what has shipped.",
            layout: "row",
            className: "rounded-lg border p-4",
            control: ({ setValue, value, onInput, onBlur, ...props }) =>
              Switch({ ...props, checked: value, onCheckedChange: setValue }),
          })}
          <div class="flex gap-2">
            ${Button({ type: "submit", children: "Create account" })}
            ${Button({
              type: "button",
              variant: "outline",
              children: "Reset",
              onClick: () => signup.reset(),
            })}
          </div>
        `)}
        <span class="text-xs text-muted-foreground"
          >Errors:
          <span class="font-medium text-foreground"
            >${computed(() => Object.keys(signup.errors()).join(", ") || "none")}</span
          ></span
        >
      </div>`,
      { align: "start" },
    )}
    `,
  ),
);
