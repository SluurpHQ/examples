/**
 * The second batch: surfaces, form controls, and the two disclosure
 * patterns.
 *
 * Laid out as a page rather than a list, so that the things that only go
 * wrong next to each other — a label beside a disabled control, a table in a
 * card, a badge in a row of text — go wrong here rather than in an
 * application.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Accordion } from "sluurp/kit/accordion.js";
import { Alert } from "sluurp/kit/alert.js";
import { AspectRatio } from "sluurp/kit/aspect-ratio.js";
import { Avatar } from "sluurp/kit/avatar.js";
import { Badge } from "sluurp/kit/badge.js";
import { Breadcrumb } from "sluurp/kit/breadcrumb.js";
import { Button } from "sluurp/kit/button.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "sluurp/kit/card.js";
import { Checkbox } from "sluurp/kit/checkbox.js";
import { Input, Textarea } from "sluurp/kit/input.js";
import { Label } from "sluurp/kit/label.js";
import { Progress } from "sluurp/kit/progress.js";
import { RadioGroup } from "sluurp/kit/radio-group.js";
import { Separator } from "sluurp/kit/separator.js";
import { Skeleton } from "sluurp/kit/skeleton.js";
import { Switch } from "sluurp/kit/switch.js";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "sluurp/kit/table.js";
import { Tabs } from "sluurp/kit/tabs.js";
import { Toggle } from "sluurp/kit/toggle.js";
import { page, section } from "./gallery.js";

const agreed = signal(false);
const partial = signal("indeterminate");
const notifications = signal(true);
const plan = signal("team");
const bold = signal(false);
const filled = signal(35);

const PEOPLE = [
  { name: "Edna Krabappel", role: "Teacher", status: "Active" },
  { name: "Seymour Skinner", role: "Principal", status: "Active" },
  { name: "Marge Simpson", role: "Guardian", status: "Invited" },
];

mount("#app", () =>
  page(
    "Kit II",
    "Surfaces, form controls, and the two disclosure patterns.",
    html`
    ${section(
      "Card",
      Card({
        className: "w-80",
        children: html`
          ${CardHeader({
            children: html`
              ${CardTitle({ children: "Storage" })}
              ${CardDescription({ children: "204 B of 250 MB used." })}
            `,
          })}
          ${CardContent({ children: Progress({ value: filled }) })}
          ${CardFooter({
            className: "gap-2 pt-6",
            children: html`
              ${Button({ children: "Upgrade", size: "sm" })}
              ${Button({
                children: "Add 10%",
                size: "sm",
                variant: "outline",
                onClick: () => filled.set(Math.min(100, filled() + 10)),
              })}
            `,
          })}
        `,
      }),
    )}

    ${section(
      "Badge",
      html`
        ${Badge({ children: "Default" })}
        ${Badge({ children: "Secondary", variant: "secondary" })}
        ${Badge({ children: "Destructive", variant: "destructive" })}
        ${Badge({ children: "Outline", variant: "outline" })}
      `,
    )}

    ${section(
      "Alert",
      html`
        <div class="flex w-full flex-col gap-3">
          ${Alert({
            title: "Heads up",
            children: html`<p>You can add components to your app using the kit.</p>`,
          })}
          ${Alert({
            variant: "destructive",
            title: "Out of space",
            children: html`<p>This project is using 250 MB of its 250 MB allowance.</p>`,
          })}
        </div>
      `,
    )}

    ${section(
      "Avatar",
      html`
        ${Avatar({ src: "/assets/nothing-here.png", fallback: "EK" })}
        ${Avatar({ fallback: "SS" })}
        ${Skeleton({ className: "h-10 w-10 rounded-full" })}
        ${Skeleton({ className: "h-4 w-48" })}
      `,
    )}

    ${section(
      "Form controls",
      html`
        <div class="flex w-full flex-col gap-5">
          <div class="flex items-center gap-2">
            ${Checkbox({ id: "terms", checked: agreed, onChange: (v) => agreed.set(v) })}
            ${Label({ htmlFor: "terms", children: "Accept terms and conditions" })}
          </div>
          <div class="flex items-center gap-2">
            ${Checkbox({ id: "mixed", checked: partial, onChange: (v) => partial.set(v) })}
            ${Label({ htmlFor: "mixed", children: "Indeterminate to start" })}
          </div>
          <div class="flex items-center gap-2">
            ${Checkbox({ id: "off", disabled: true })}
            ${Label({ htmlFor: "off", children: "Disabled, and the label dims with it" })}
          </div>

          <div class="flex items-center gap-2">
            ${Switch({
              id: "notify",
              checked: notifications,
              onChange: (v) => notifications.set(v),
            })}
            ${Label({ htmlFor: "notify", children: "Email notifications" })}
          </div>

          ${RadioGroup({
            name: "plan",
            value: plan,
            onChange: (v) => plan.set(v),
            options: [
              { value: "free", label: "Free" },
              { value: "team", label: "Team" },
              { value: "enterprise", label: "Enterprise" },
            ],
          })}

          <div class="flex flex-col gap-1.5">
            ${Label({ htmlFor: "email", children: "Email" })}
            ${Input({ id: "email", type: "email", placeholder: "edna@springfield.k12.us" })}
          </div>
          <div class="flex flex-col gap-1.5">
            ${Label({ htmlFor: "note", children: "Note" })}
            ${Textarea({ id: "note", placeholder: "Anything the office should know" })}
          </div>

          <div class="flex gap-2">
            ${Toggle({ children: "Bold", pressed: bold, onChange: (v) => bold.set(v) })}
            ${Toggle({ children: "Italic", variant: "outline" })}
            ${Toggle({ children: "Small", size: "sm", variant: "outline" })}
          </div>
        </div>
      `,
    )}

    ${section(
      "Tabs",
      html`<div class="w-full">
        ${Tabs({
          items: [
            {
              value: "account",
              label: "Account",
              content: html`<p class="text-sm text-muted-foreground">
                Change your name and address here.
              </p>`,
            },
            {
              value: "password",
              label: "Password",
              content: html`<p class="text-sm text-muted-foreground">
                Change your password here. You will be signed out everywhere else.
              </p>`,
            },
            { value: "gone", label: "Disabled", disabled: true, content: html`<p>Unreachable.</p>` },
          ],
        })}
      </div>`,
    )}

    ${section(
      "Accordion",
      html`<div class="w-full">
        ${Accordion({
          items: [
            {
              value: "one",
              label: "Is it accessible?",
              content: html`<p>Yes. It follows the disclosure pattern, and the trigger
                carries aria-expanded and aria-controls.</p>`,
            },
            {
              value: "two",
              label: "Is it styled?",
              content: html`<p>It comes with the same classes as upstream, and the chevron
                turns because the trigger carries its own data-state.</p>`,
            },
            {
              value: "three",
              label: "Is it animated?",
              content: html`<p>The panel publishes its own measured height, which is what
                the keyframes need — height: auto cannot be animated.</p>`,
            },
          ],
        })}
      </div>`,
    )}

    ${section(
      "Table",
      html`<div class="w-full">
        ${Table({
          children: html`
            ${TableCaption({ children: "Everyone on the roll." })}
            ${TableHeader({
              children: TableRow({
                children: html`
                  ${TableHead({ children: "Name" })}
                  ${TableHead({ children: "Role" })}
                  ${TableHead({ children: "Status", className: "text-right" })}
                `,
              }),
            })}
            ${TableBody({
              children: PEOPLE.map((person, index) =>
                TableRow({
                  selected: index === 1,
                  children: html`
                    ${TableCell({ children: person.name, className: "font-medium" })}
                    ${TableCell({ children: person.role })}
                    ${TableCell({
                      className: "text-right",
                      children: Badge({
                        children: person.status,
                        variant: person.status === "Active" ? "secondary" : "outline",
                      }),
                    })}
                  `,
                }),
              ),
            })}
          `,
        })}
      </div>`,
    )}

    ${section(
      "Separator and aspect ratio",
      html`<div class="flex w-full flex-col gap-4">
        <div class="text-sm">Above the line</div>
        ${Separator({})}
        <div class="text-sm">Below it</div>
        <div class="flex h-5 items-center gap-3 text-sm">
          <span>Blog</span>
          ${Separator({ orientation: "vertical" })}
          <span>Docs</span>
          ${Separator({ orientation: "vertical" })}
          <span>Source</span>
        </div>
        <div class="w-64">
          ${AspectRatio({
            ratio: 16 / 9,
            className: "rounded-md bg-muted",
            children: html`<div
              class="flex h-full w-full items-center justify-center text-xs text-muted-foreground"
            >16 / 9</div>`,
          })}
        </div>
      </div>`,
    )}
    `,
  ),
);
