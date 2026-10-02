import { effect, onCleanup, signal } from "sluurp/reactive";
import { render } from "sluurp/ui";
import { cn } from "sluurp/cn";
import { onDetached, position, uid } from "sluurp/primitives";
import { floatingPanel } from "./internal.js";
import type { Props } from "./types.ts";

/* ===================================================================
   Tooltip
   =================================================================== */

/**
 * A label that appears beside something on hover.
 *
 * Three things a hand-rolled tooltip almost always misses.
 *
 * It opens on *focus* as well as hover, or it does not exist for anybody
 * using a keyboard, and on a touch screen there is no hover at all.
 *
 * Escape closes it without moving focus, which WCAG 1.4.13 asks for and
 * which matters because a tooltip covering the thing you are reading is
 * otherwise inescapable.
 *
 * The delay is on opening and not on closing. That keeps a row of icon
 * buttons from flashing as the pointer crosses it, while a tooltip that
 * lingers is one that covers what you moved to read.
 */
export interface TooltipProps extends Props {
  label?: unknown;
  /**
   * Classes for the span the trigger is wrapped in.
   *
   * It is `inline-flex`, which is right for a button in a row of prose and
   * wrong for one that is supposed to fill its container: a sidebar item
   * asked to be `w-full` then fills a box that is only as wide as itself.
   */
  wrapperClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  /** Opening is delayed; closing is not. */
  delay?: number;
}

export function Tooltip({
  label: text,
  children,
  side = "top",
  sideOffset = 4,
  delay = 300,
  wrapperClassName,
}: TooltipProps = {}) {
  const open = signal(false);
  const trigger = signal<HTMLElement | null>(null);
  const id = uid("tooltip");
  let timer: ReturnType<typeof setTimeout> | undefined;

  // A trigger taken off the page — a button whose row was removed, the
  // toolbar of a message that closed — never says the pointer left it, so
  // while the tooltip is up, whether it is still there is looked at.
  let watch: ReturnType<typeof setInterval> | undefined;
  const said = () => {
    const v = typeof text === "function" ? (text as () => unknown)() : text;
    return v !== undefined && v !== null && v !== "";
  };
  const show = () => {
    clearTimeout(timer);
    // A label that says nothing — a menu trigger that has words of its own —
    // is not a tooltip.
    if (!said()) return;
    timer = setTimeout(() => {
      open.set(true);
      clearInterval(watch);
      watch = setInterval(() => {
        // Gone, or still there but not shown: a toolbar hidden when its
        // message moved has no place on screen, and a tooltip anchored to it
        // was rendered in the corner.
        const at = trigger();
        if (!at?.isConnected || at.getClientRects().length === 0) hide();
      }, 250);
    }, delay);
  };
  const hide = () => {
    clearTimeout(timer);
    clearInterval(watch);
    open.set(false);
  };
  // The panel is taken down by floatingPanel with whatever rendered this; the
  // timers are this component's own, and a pending "show" must not fire
  // for a trigger that is gone.
  onCleanup(hide);

  floatingPanel({
    open,
    anchor: trigger,
    name: "tooltip",
    side,
    sideOffset,
    dismissOnOutside: false,
    onDismiss: () => hide(),
    build: () => {
      const panel = document.createElement("div");
      panel.id = id;
      panel.setAttribute("role", "tooltip");
      // No `overflow-hidden`: the arrow hangs outside the box, and a box
      // that clips its own arrow has none.
      panel.className = `
    z-50 max-w-64 rounded-md bg-foreground px-3 py-1.5 text-xs text-balance
    text-background animate-in fade-in-0
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0`;
      // Only a fade: scaled or slid in, the text moves and shimmers as it settles.
      render(panel, text as any);

      pointAt(panel, trigger, side);

      return panel;
    },
  });

  return (
    <span
      data-slot="tooltip"
      class={cn("inline-flex", wrapperClassName)}
      ref={(element: HTMLElement) => {
        queueMicrotask(() => {
          const found = (element.firstElementChild ?? element) as HTMLElement;
          trigger.set(found);
          effect(() => {
            if (open()) found.setAttribute("aria-describedby", id);
            else found.removeAttribute("aria-describedby");
          });
        });
        // A trigger removed while its tooltip is open, by navigating away
        // from it, would otherwise leave the panel on the next page.
        onDetached(element, hide);
      }}
      onPointerenter={show}
      onPointerleave={hide}
      // From the keyboard only, as a focus ring is: a click leaves focus on
      // the button, and a tooltip opened by that stayed up after the click
      // had done its work — and after the button had gone from view.
      onFocusin={(e: FocusEvent) => {
        if ((e.target as Element).matches?.(":focus-visible")) {
          open.set(true);
          clearInterval(watch);
          watch = setInterval(() => {
            const at = trigger();
            if (!at?.isConnected || at.getClientRects().length === 0) hide();
          }, 250);
        }
      }}
      onPointerdown={hide}
      onFocusout={hide}
    >{children}</span>
  );
}


/**
 * The little triangle a tooltip points with, kept on what it is about.
 *
 * A rotated square rather than a border trick or an SVG: it inherits the
 * panel's colour, so a tooltip that is themed differently keeps its point
 * the same shade as its body. Which edge it hangs off depends on where the
 * panel ended up — it may flip when there is no room — so it follows the
 * panel's side attribute rather than the side that was asked for.
 */
function pointAt(panel: HTMLElement, anchorOf: () => Element | null, side: string, nearStart = false) {
  const arrow = document.createElement("div");
  arrow.className = "absolute size-2 rotate-45 rounded-[1px] bg-foreground";
  panel.append(arrow);
  const place = () => {
    // Wrapped text leaves the box at its widest; it is narrowed to its longest line.
    if (panel.isConnected && !panel.dataset.hug) {
      panel.dataset.hug = "1";
      const range = document.createRange();
      // Everything but the arrow, which comes last.
      range.setStart(panel, 0);
      range.setEnd(panel, panel.childNodes.length - 1);
      const lines = [...range.getClientRects()].filter((r) => r.width > 0);
      if (new Set(lines.map((r) => Math.round(r.top))).size > 1) {
        const pad = parseFloat(getComputedStyle(panel).paddingLeft) * 2;
        panel.style.width = `${Math.ceil(Math.max(...lines.map((r) => r.width)) + pad)}px`;
      }
    }
    const at = panel.dataset.side ?? side;
    const style = arrow.style;
    style.top = style.right = style.bottom = style.left = "";
    style.marginTop = style.marginLeft = "";
    // At the anchor's middle, not the panel's: a tooltip kept on screen
    // near an edge is shifted, and its point has to stay on its subject.
    const anchor = anchorOf()?.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    if (at === "top" || at === "bottom") {
      if (anchor && box.width) {
        const x = anchor.left + (nearStart ? Math.min(anchor.width / 2, 16) : anchor.width / 2) - box.left - 4;
        style.left = `${Math.min(Math.max(x, 6), box.width - 14)}px`;
      } else {
        style.left = "50%";
        style.marginLeft = "-4px";
      }
      if (at === "top") style.bottom = "-3px";
      else style.top = "-3px";
    } else if (anchor && box.height) {
      const y = anchor.top + anchor.height / 2 - box.top - 4;
      style.top = `${Math.min(Math.max(y, 6), box.height - 14)}px`;
      if (at === "left") style.right = "-3px";
      else style.left = "-3px";
    } else {
      style.top = "50%";
      style.marginTop = "-4px";
      if (at === "left") style.right = "-3px";
      else style.left = "-3px";
    }
  };
  place();
  // Measured again once it has finished growing in, and whenever the panel
  // moves or flips.
  panel.addEventListener("animationend", place);
  new MutationObserver(place).observe(panel, { attributes: true, attributeFilter: ["data-side", "style"] });
}

/**
 * The whole of any text cut short with "…", on hover: a name too long for
 * its row in the sidebar, a description in a list. Set up once for an app.
 *
 * Only what is truly cut short — something whose text is wider than its
 * box — and only after the pointer has rested on it, as other tooltips; a
 * row with a tooltip of its own keeps its own.
 */
export function truncationTooltips(root: Document | HTMLElement = document) {
  let panel: HTMLElement | null = null;
  let unposition: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let at: HTMLElement | null = null;

  const hide = () => {
    clearTimeout(timer);
    unposition?.();
    unposition = null;
    panel?.remove();
    panel = null;
    at = null;
  };
  // Cut short: its text overflows its own box, or a box around it that
  // clips — a row wider than the sidebar it is in, with or without "…".
  // A box that scrolls is not cut: what is past its edge is a scroll away,
  // and a tooltip repeating a whole list of cards was noise.
  const scrolls = (style: CSSStyleDeclaration) =>
    ["auto", "scroll"].includes(style.overflowX) || ["auto", "scroll"].includes(style.overflowY);
  const clipped = (el: HTMLElement) => {
    const style = getComputedStyle(el);
    if (!scrolls(style)) {
      if (el.scrollWidth > el.clientWidth + 1 && (style.overflowX !== "visible" || style.textOverflow === "ellipsis")) return true;
      if (el.scrollHeight > el.clientHeight + 1 && style.webkitLineClamp !== "none") return true;
    }
    const box = el.getBoundingClientRect();
    for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
      const around = getComputedStyle(up);
      if (around.overflowX === "visible") continue;
      if (scrolls(around)) break;
      const clip = up.getBoundingClientRect();
      if (box.right > clip.right + 1 || box.left < clip.left - 1) return true;
      if (up.scrollWidth > up.clientWidth + 1 && el.scrollWidth > up.clientWidth) return true;
      break;
    }
    return false;
  };
  // The text under the pointer, and the few boxes around it — a label in a
  // row, the row in its list — looked at until one is cut.
  // What the tooltip says: the words under the pointer — the label, not the
  // row with its icon.
  let words = "";
  const cutFrom = (target: Element | null): HTMLElement | null => {
    let el = target as HTMLElement | null;
    words = "";
    // A surface that clips on purpose (a canvas of frames, a map) is not text cut short.
    // Nor is a chart: its words are drawn where they belong, and a map's box clips its tiles.
    if (el?.closest?.("[data-no-cut-tip], figure:has(> * svg[role=img]), figure:has(svg[role=img]), figure:has(canvas)")) return null;
    for (let i = 0; el && i < 4; i++, el = el.parentElement) {
      if (el.closest("[role=tooltip], [data-slot=tooltip] [data-sidebar=menu-button]")) {
        // A row with a tooltip of its own when the sidebar is collapsed is
        // still looked at when it is open; the tooltip itself never is.
        if (el.closest("[role=tooltip]")) return null;
      }
      if (!el.textContent?.trim() || el.children.length > 4) break;
      // A box holding a chart, or a canvas that pans and zooms: clipped on purpose, and its "text" a stylesheet.
      if (el.matches("[data-zoomable]") || el.querySelector("figure, svg[role=img], canvas, style")) break;
      if (!words) words = el.textContent.replace(/\s+/g, " ").trim();
      if (clipped(el)) return el;
    }
    return null;
  };
  const cut = (el: HTMLElement) => clipped(el);

  const over = (e: Event) => {
    const el = cutFrom(e.target as Element | null);
    if (el === at) return;
    hide();
    if (!el) return;
    // A sidebar's rows, and what asks for it, show themselves whole by
    // running past — as a song title in Winamp does — not in a tooltip.
    if (el.children.length === 0 && el.closest("[data-sidebar], [data-marquee]")) {
      at = el;
      marquee(el);
      return;
    }
    const shown = words;
    at = el;
    timer = setTimeout(() => {
      if (at !== el || !el.isConnected || !cut(el)) return;
      panel = document.createElement("div");
      panel.setAttribute("role", "tooltip");
      panel.className =
        "z-50 max-w-sm rounded-md bg-foreground px-3 py-1.5 text-xs text-background break-words animate-in fade-in-0";
      panel.textContent = shown;
      document.body.append(panel);
      // Beside a sidebar row, as its own tooltips are; above anything else.
      const inSidebar = !!el.closest("[data-sidebar]");
      unposition = position(panel, el, { side: inSidebar ? "right" : "top", sideOffset: inSidebar ? 8 : 4, align: inSidebar ? "center" : "start", name: "tooltip" });
      pointAt(panel, () => el, inSidebar ? "right" : "top", true);
    }, 400);
  };
  root.addEventListener("pointerover", over);
  root.addEventListener("pointerdown", hide, true);
  root.addEventListener("scroll", hide, true);
  const leave = (e: Event) => {
    if (at && !at.contains((e as PointerEvent).relatedTarget as Node | null)) hide();
  };
  root.addEventListener("pointerout", leave);
  return () => {
    hide();
    root.removeEventListener("pointerover", over);
    root.removeEventListener("pointerdown", hide, true);
    root.removeEventListener("scroll", hide, true);
    root.removeEventListener("pointerout", leave);
  };
}

/**
 * Text cut short, rested on: after a moment it runs past, round and round —
 * the words, a gap, the words again — at a steady reading pace, as a song
 * title in Winamp does, and stands still again as the pointer leaves. For
 * an element holding only its words.
 *
 * `always`: running for as long as the words do not fit, rested on or not —
 * for a label nobody can rest on (a name on somebody else's selection).
 */
export function marquee(el: HTMLElement, { always = false }: { always?: boolean } = {}) {
  if (el.scrollWidth <= el.clientWidth || el.dataset.running) return;
  const text = el.textContent ?? "";
  let turn: Animation | null = null;
  const wait = setTimeout(() => {
    if (!el.isConnected || (!always && !el.matches(":hover"))) return;
    el.dataset.running = "";
    const run = document.createElement("span");
    run.className = "inline-block whitespace-nowrap";
    run.textContent = `${text} \u2022 ${text} \u2022 `;
    el.textContent = "";
    el.style.textOverflow = "clip";
    el.append(run);
    const lap = run.scrollWidth / 2;
    turn = run.animate([{ transform: "translateX(0)" }, { transform: `translateX(-${lap}px)` }], { duration: (lap / 40) * 1000, iterations: Infinity });
  }, always ? 0 : 450);
  if (always) return;
  el.addEventListener(
    "pointerleave",
    () => {
      clearTimeout(wait);
      if (!turn) return;
      turn.cancel();
      el.textContent = text;
      el.style.textOverflow = "";
      delete el.dataset.running;
    },
    { once: true },
  );
}
