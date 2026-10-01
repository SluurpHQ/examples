/**
 * The seventh batch: layout you can move.
 *
 * Drawer, resizable and carousel are all gestures. None of them can be
 * judged from a screenshot — this page exists to be dragged, arrowed and
 * thrown around.
 */

import { signal, computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Button } from "sluurp/kit/button.js";
import { Card, CardContent } from "sluurp/kit/card.js";
import { Carousel, CarouselDots } from "sluurp/kit/carousel.js";
import { Drawer } from "sluurp/kit/drawer.js";
import { Input } from "sluurp/kit/input.js";
import { Label } from "sluurp/kit/label.js";
import { ResizablePanelGroup } from "sluurp/kit/resizable.js";
import { page, section } from "./gallery.js";

const bottom = signal(false);
const right = signal(false);
const layout = signal([25, 75]);

let dots = null;
const carouselView = Carousel({
  slides: Array.from(
    { length: 5 },
    (_, i) =>
      html`<div class="p-1">
        ${Card({
          className: "aspect-square",
          children: CardContent({
            className: "flex aspect-square items-center justify-center p-6",
            children: html`<span class="text-4xl font-semibold">${i + 1}</span>`,
          }),
        })}
      </div>`,
  ),
  basis: "md:basis-1/2 lg:basis-1/3",
  setApi: (api) => {
    dots = api;
  },
});

mount("#app", () =>
  page(
    "Kit VII",
    "Layout you can move — three components that are mostly gesture.",
    html`
    ${section(
      "Drawer",
      "A dialog that comes up from an edge and can be thrown back. Drag the handle " +
        "down: less than half the panel springs back, past half or a quick flick closes " +
        "it. Dragging the wrong way resists rather than following, and a drag that starts " +
        "on scrolled content scrolls that instead.",
      html`<div class="flex gap-3">
        ${Button({
          children: "Open from bottom",
          variant: "outline",
          onClick: () => bottom.set(true),
        })}
        ${Button({
          children: "Open from right",
          variant: "outline",
          onClick: () => right.set(true),
        })}
      </div>
      ${Drawer({
        open: bottom,
        direction: "bottom",
        title: "Move goal",
        description: "Set your daily activity goal.",
        children: html`<div class="flex flex-col gap-3 p-4 pt-0">
          ${Label({ htmlFor: "goal", children: "Calories / day" })}
          ${Input({ id: "goal", type: "number", value: "350" })}
        </div>`,
        footer: html`${Button({ children: "Submit" })}
        ${Button({
          children: "Cancel",
          variant: "outline",
          onClick: () => bottom.set(false),
        })}`,
      })}
      ${Drawer({
        open: right,
        direction: "right",
        title: "Details",
        description: "The same panel, off a different edge.",
        children: html`<div class="p-4 pt-0 text-sm text-muted-foreground"
          >Drag rightwards to dismiss.</div
        >`,
      })}`,
    )}

    ${section(
      "Resizable",
      "The divider is a separator with a keyboard: tab to it and the arrows move it a " +
        "percent at a time, ten with Shift, to the ends with Home and End. The divider is " +
        "a one-pixel line at rest; hover or focus it and the grab point fades in where " +
        "the pointer already is. The hit target is twelve pixels wide the whole time.",
      html`<div class="w-full max-w-2xl">
        ${ResizablePanelGroup({
          direction: "horizontal",
          className: "min-h-[200px] rounded-lg border",
          onLayout: (next) => layout.set(next.map((n) => Math.round(n))),
          panels: [
            {
              defaultSize: 25,
              minSize: 15,
              children: html`<div class="flex h-full items-center justify-center p-6"
                ><span class="font-semibold">One</span></div
              >`,
            },
            {
              children: ResizablePanelGroup({
                direction: "vertical",
                panels: [
                  {
                    defaultSize: 40,
                    minSize: 20,
                    children: html`<div class="flex h-full items-center justify-center p-6"
                      ><span class="font-semibold">Two</span></div
                    >`,
                  },
                  {
                    children: html`<div class="flex h-full items-center justify-center p-6"
                      ><span class="font-semibold">Three</span></div
                    >`,
                  },
                ],
              }),
            },
          ],
        })}
      </div>
      <span class="text-xs text-muted-foreground"
        >Layout:
        <span class="font-medium text-foreground"
          >${computed(() => layout().join(" / "))}</span
        ></span
      >`,
      { align: "start" },
    )}

    ${section(
      "Carousel",
      "Scroll-snap rather than a translated track, so a trackpad swipe, a touch flick " +
        "and shift-wheel all work without a line of code. What we add is what snap " +
        "cannot do: the two buttons, knowing when to stop, and the arrow keys.",
      html`<div class="flex flex-col items-center gap-4">
        <div class="w-full max-w-sm px-12">${carouselView}</div>
        ${CarouselDots({ api: dots })}
      </div>`,
    )}
    `,
  ),
);
