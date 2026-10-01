/**
 * The page is TypeScript too, imported straight from the HTML.
 *
 * `<script type="module" src="./typescript.ts">` — the extension in the URL
 * is not consulted by a module loader, only the content type, so this needs
 * no rewriting of anybody's imports and no build step to make it true.
 */

import { computed, signal } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Badge } from "sluurp/kit/badge.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "sluurp/kit/card.js";
import { Input } from "sluurp/kit/input.js";
import { Label } from "sluurp/kit/label.js";
import { greet, Mood, TYPED_AT, type Visitor } from "./greeting.ts";
import { Box, Level, Person, Units, first, pick } from "./features.ts";

const name = signal<string>("Ada");
const formal = signal<boolean>(false);

const visitor = computed<Visitor>(() => ({ name: name(), returning: true }));

mount("#app", () =>
  html`<div class="mx-auto max-w-lg px-6 py-16">
    ${Card({
      children: html`${CardHeader({
        children: html`${CardTitle({ children: "TypeScript, served" })}
        ${CardDescription({
          children:
            "This page and its import are both .ts files. Nothing compiled them — " +
            "the browser asked, and the server answered with JavaScript.",
        })}`,
      })}
      ${CardContent({
        children: html`<div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            ${Label({ htmlFor: "who", children: "Name" })}
            ${Input({
              id: "who",
              value: name,
              onInput: (event: Event) => name.set((event.target as HTMLInputElement).value),
            })}
          </div>
          <p class="text-lg font-medium" id="said"
            >${computed(() => greet(visitor(), formal() ? Mood.Formal : Mood.Warm))}</p
          >
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            ${Badge({ variant: "secondary", children: "erased at" })}
            <span id="stamp">${TYPED_AT}</span>
          </div>

          <!-- Not only erased: the parts of TypeScript that are real code
               are lowered into real JavaScript, and this is them running. -->
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" id="features">
            ${[
              ["enum", `Level.High = ${Level.High}, pick() = ${pick(Level.High)}`],
              ["namespace", `Units.scale(3) = ${Units.scale(3)}`],
              ["generic", `first([2, 4]) = ${first<number>([2, 4])}`],
              ["generic class", `Box.get().n = ${new Box<{ n: number }>({ n: 7 }).get().n}`],
              ["parameter property", `new Person("Ada", 36).older() = ${new Person("Ada", 36).older()}`],
            ].map(
              ([what, said]) => html`<dt class="font-mono text-xs text-muted-foreground"
                  >${what}</dt
                ><dd>${said}</dd>`,
            )}
          </dl>
        </div>`,
      })}`,
    })}
  </div>`,
);
