import { collect, effect, onCleanup } from "sluurp/reactive";
import { attr, on, render } from "sluurp/ui";
import { cn } from "sluurp/cn";
import { dismissable, focusScope, lockScroll, portal, portalRoot, position, presence, scopeFrom } from "sluurp/primitives";

import type { OpenSignal, Reactive } from "./types.ts";

type Open = OpenSignal;

export interface MenuItem {
  label?: unknown;
  icon?: unknown;
  shortcut?: unknown;
  disabled?: boolean;
  separator?: boolean;
  heading?: boolean;
  /** Present makes the row a checkbox; `selected` makes it a radio. */
  checked?: Reactive<boolean>;
  selected?: Reactive<boolean>;
  onSelect?: (checked?: boolean) => void;
}

/* ===================================================================
   The two overlay lifecycles
   =================================================================== */

/**
 * A panel beside a trigger: menus, popovers, tooltips, hover cards.
 *
 * Built when it opens and disposed when the exit animation finishes, so
 * a component that is never opened costs nothing and one that is closed
 * leaves no listeners, no observers and no nodes behind.
 *
 * Shared because the difference between these components is what is inside
 * the panel and when it opens — not any of this. Writing it per component is
 * how five of them end up with five slightly different ideas about whether
 * Escape restores focus.
 */
export function floatingPanel({
  open,
  anchor,
  build,
  name,
  side = "bottom",
  align = "center",
  sideOffset = 4,
  dismissOnOutside = true,
  dismissOnEscape = true,
  trapFocus = false,
  onDismiss,
}: {
  open: Open;
  anchor: HTMLElement | (() => HTMLElement | null);
  build: () => HTMLElement;
  name?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  dismissOnOutside?: boolean;
  dismissOnEscape?: boolean;
  trapFocus?: boolean;
  onDismiss?: (reason: string, event?: Event) => void;
}) {
  let mounted: any = null;

  effect(() => {
    const wanted = typeof open === "function" ? open() : open;
    const trigger = typeof anchor === "function" ? anchor() : anchor;

    if (wanted && !mounted && trigger) {
      // What the panel builds ends when it has gone: left running, a closed panel's bindings woke
      // with the next opening and rebuilt, unseen.
      const [panel, end] = collect(build);
      // Where its trigger is: in a story's preview, or in the page.
      const unportal = portal(panel, portalRoot(trigger));
      scopeFrom(trigger, panel);
      const panelPresence = presence(panel, {
        onExit: () => {
          end();
          unportal();
          mounted = null;
        },
      });
      const unposition = position(panel, trigger, { side, align, sideOffset, name });
      const release = trapFocus ? focusScope(panel, { autoFocus: false }) : null;
      const undismiss = dismissable(panel, {
        escape: dismissOnEscape,
        outside: dismissOnOutside,
        onDismiss: (reason: string, event?: Event) => {
          // A click on the trigger is not an outside click as far as this is
          // concerned: the trigger's own handler is about to toggle it, and
          // dismissing here as well closes and reopens in one gesture.
          if (reason === "outside" && trigger.contains((event?.target as Node) ?? null)) return;
          onDismiss?.(reason);
        },
      });

      mounted = {
        panel,
        panelPresence,
        elements: [panel],
        presences: [panelPresence],
        end,
        teardown: () => {
          undismiss();
          unposition();
          release?.({ moveFocus: false });
        },
      };

      panelPresence.reveal();
      return;
    }

    if (!wanted && mounted) {
      mounted.teardown();
      mounted.panelPresence.setOpen(false);
    }
  });

  // Taken down with whatever made it: a component re-rendered, a page left.
  // At once and out of sight, not animated closed — the copy that replaces
  // it may be opening in the same moment.
  onCleanup(() => {
    const m = mounted;
    if (!m) return;
    m.teardown();
    m.end();
    for (const el of m.elements) el.style.display = "none";
    for (const p of m.presences) p.setOpen(false);
  });

  return { panel: () => mounted?.panel ?? null };
}

/**
 * A surface over the whole page: dialog, alert dialog, sheet.
 *
 * The overlay and the content are two elements rather than one wrapping the
 * other, because the content has to be able to animate independently of the
 * backdrop — a sheet slides in while its overlay only fades — and because an
 * overlay that contains the content cannot be clicked through to dismiss.
 */
export function modalSurface({
  open,
  overlayClass,
  contentClass,
  fill,
  onClose,
  dismissable: canDismiss = true,
}: {
  open: Open;
  overlayClass: string;
  contentClass: string;
  fill: (content: HTMLElement, close: (why?: string) => void) => void;
  onClose?: (why?: string) => void;
  dismissable?: boolean;
}) {
  let mounted: any = null;
  let reason: string | undefined;

  const close = (why?: string) => {
    reason = why;
    open.set(false);
    onClose?.(why);
  };

  effect(() => {
    const wanted = typeof open === "function" ? open() : open;

    if (wanted && !mounted) {
      const overlay = document.createElement("div");
      overlay.className = overlayClass;
      const content = document.createElement("div");
      content.className = contentClass;

      const unportalOverlay = portal(overlay);
      const unportalContent = portal(content);
      scopeFrom(document.activeElement, content);
      const unlock = lockScroll();

      // What the content builds ends when it has gone (see `floatingPanel`).
      let end = () => {};
      const overlayPresence = presence(overlay, { onExit: () => unportalOverlay() });
      const contentPresence = presence(content, {
        onExit: () => {
          end();
          unportalContent();
          unlock();
          mounted = null;
        },
      });

      [, end] = collect(() => fill(content, close));

      const release = focusScope(content);
      const undismiss = dismissable(content, {
        modal: true,
        escape: canDismiss,
        outside: false,
        onDismiss: (why) => close(why),
      });
      if (canDismiss) {
        overlay.addEventListener("pointerdown", () => close("overlay"));
      }

      mounted = {
        content,
        end: () => end(),
        teardown: () => {
          undismiss();
          // Focus goes back to whatever opened this, unless a click
          // elsewhere has already put it where the person meant.
          release({ moveFocus: reason !== "overlay" && reason !== "outside" });
        },
        overlayPresence,
        contentPresence,
        elements: [overlay, content],
        presences: [overlayPresence, contentPresence],
      };

      overlayPresence.reveal();
      contentPresence.reveal();
      return;
    }

    if (!wanted && mounted) {
      mounted.teardown();
      reason = undefined;
      mounted.overlayPresence.setOpen(false);
      mounted.contentPresence.setOpen(false);
    }
  });

  // Taken down with whatever made it: a component re-rendered, a page left.
  // At once and out of sight, not animated closed — the copy that replaces
  // it may be opening in the same moment.
  onCleanup(() => {
    const m = mounted;
    if (!m) return;
    m.teardown();
    m.end();
    for (const el of m.elements) el.style.display = "none";
    for (const p of m.presences) p.setOpen(false);
  });
}

/**
 * What lies over the page under anything modal — a dialog, a sheet, a
 * drawer, the admin's panels: one shade, and the page blurred behind it, so
 * what is under stays recognisable without competing with what is on top.
 * One class, so every modal in every app looks the same.
 */
/**
 * Focus `element` once it is on screen: built a moment before the dialog or popover around it opens,
 * focus() would do nothing. Tried each frame for a few, from the next microtask.
 */
export function focusWhenShown(element: HTMLElement, frames = 20) {
  const attempt = (left: number) => {
    if (element.isConnected && element.getClientRects().length) element.focus({ preventScroll: true });
    else if (left) requestAnimationFrame(() => attempt(left - 1));
  };
  queueMicrotask(() => attempt(frames));
}

/** Every menu's row, and its heading: one size across the kit (taller for a finger). */
export const MENU_ROW = "min-h-7 py-0.5 pointer-coarse:min-h-10 text-xs pointer-coarse:text-sm";
export const MENU_HEAD = "px-2 py-1 text-xs font-medium text-muted-foreground";

export const OVERLAY_CLASS =
  `
    fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0
    data-[state=open]:fade-in-0`;


/* ===================================================================
   The menu family, shared
   =================================================================== */

/**
 * A menu panel's classes, differing only in which Radix variable it reads.
 *
 * The dropdown, the context menu and the menubar are the same panel with the
 * same items opened three different ways — by clicking a button, by
 * right-clicking something, and by moving along a bar. Three copies of this
 * would be three chances for one of them to grow a different focus rule.
 */
export function menuPanelClass(name: string, extra?: unknown, { instant = false }: { instant?: boolean } = {}) {
  // A template literal, interpolation and all — which is the readable way to
  // write a class list that has a value in the middle of it.
  // Growing from what opened it (the origin), and leaving more quietly than it came. A menu opened
  // often (`instant`, the context menu) appears at once: only its leaving is animated.
  const opening = instant
    ? ""
    : `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95
    data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
    data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`;
  return cn(
    `
    z-50 max-h-[--radix-${name}-content-available-height] min-w-[8rem]
    overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1
    text-popover-foreground shadow-md
    data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]
    ${opening}
    origin-[--radix-${name}-content-transform-origin]`,
    extra,
  );
}

/**
 * The rows inside a menu.
 *
 * Four kinds: an ordinary item, a checkbox item, a radio item, and the two
 * things that are not items at all — a heading and a separator. The last two
 * carry no `data-item`, which is what keeps the arrow keys from stopping on
 * them.
 *
 * Hovering moves focus. That is not decoration: without it the pointer and
 * the keyboard disagree about which row is current, and a menu where the
 * highlight is in one place and Enter acts on another is a menu that feels
 * broken without anybody being able to say why.
 */
export function menuRows(
  items: MenuItem[],
  { close, indent = false }: { close: () => void; indent?: boolean },
) {
  // If anything in the menu is checkable, everything is indented.
  //
  // Otherwise the labels do not line up: a row with a tick sits eight
  // units in and the rows above and below sit at two, and the column has a
  // step in the middle of it. Real menus align the text and leave the gutter
  // empty for the rows that have nothing to put in it.
  const gutter =
    indent || items.some((item) => item.checked !== undefined || item.selected !== undefined);

  return items.map((item: MenuItem) => {
    if (item.separator) {
      return <div role="separator" class="-mx-1 my-1 h-px bg-border"></div>;
    }
    if (item.heading) {
      return (
        <div class={cn(MENU_HEAD, indent && "pl-8")}>
          {item.label}
        </div>
      );
    }

    const checkable = item.checked !== undefined || item.selected !== undefined;
    const role = item.selected !== undefined
      ? "menuitemradio"
      : item.checked !== undefined
        ? "menuitemcheckbox"
        : "menuitem";
    const on_ = () =>
      item.selected !== undefined
        ? (typeof item.selected === "function" ? item.selected() : item.selected)
        : (typeof item.checked === "function" ? item.checked() : item.checked);

    const act = () => {
      if (item.disabled) return;
      // A checkable row does not close the menu: the point of it is to set
      // several things, and closing after each one means opening it again.
      if (!checkable) close();
      item.onSelect?.(checkable ? !on_() : undefined);
    };

    return (
      <div
        role={role}
        data-item
        data-disabled={item.disabled ? "" : undefined}
        aria-disabled={item.disabled ? "true" : undefined}
        aria-checked={checkable ? () => String(!!on_()) : undefined}
        data-label={item.label ?? ""}
        class={cn(
          `
    relative flex ${MENU_ROW} cursor-default select-none items-center gap-2 rounded-sm px-2
    font-sans font-normal outline-none transition-colors focus:bg-accent focus:text-accent-foreground
    data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4
    [&>svg]:shrink-0`,
          gutter && "pl-8 pr-2",
        )}
        onClick={act}
        onKeydown={(event: KeyboardEvent) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          act();
        }}
        onPointermove={(event: PointerEvent) => {
          if (item.disabled) return;
          (event.currentTarget as HTMLElement).focus({ preventScroll: true });
        }}
      >
        {checkable ? (
          <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            {on_() ? (role === "menuitemradio" ? dotIcon() : checkIcon()) : ""}
          </span>
        ) : (item.icon ?? "")}
        <span>{item.label}</span>
        {item.shortcut ? (
          <span class="ml-auto text-xs tracking-widest text-muted-foreground">
            {item.shortcut}
          </span>
        ) : ""}
      </div>
    );
  });
}

/* ===================================================================
   Shared helpers
   =================================================================== */

/**
 * Render templates into an element that was built by hand.
 *
 * The portalled components create their own nodes — they have to, since they
 * live at the end of the body rather than where they are written — and still
 * want templates for their contents.
 */
export function renderInto(element: Element | DocumentFragment, template: any) {
  render(element, template);
}

/** Spread leftover options onto an element: `onClick`, `title`, `id`. */
export function bindAll(rest: Record<string, unknown>) {
  const parts = [];
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null) continue;
    if (key.startsWith("on") && typeof value === "function") {
      parts.push(on(key.slice(2).toLowerCase(), value as (event: Event) => void));
    } else {
      parts.push(attr(key, value as string));
    }
  }
  return parts;
}



export const closeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"
  ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

export const checkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

export const minusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
    aria-hidden="true"><path d="M5 12h14" /></svg>
);

export const chevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" class="h-4 w-4 shrink-0 transition-transform duration-200"
    aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

export const chevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
);

/** Three dots in a row: "more", as a tab bar's last place. */
export const moreIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
);

export const dotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"
    fill="currentColor" aria-hidden="true"><circle cx="4" cy="4" r="4" /></svg>
);

export const TOAST_ICONS: Record<string, () => unknown> = {
  success: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="text-green-500" aria-hidden="true"
    ><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  error: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="text-destructive" aria-hidden="true"
    ><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
  ),
  warning: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="text-amber-500" aria-hidden="true"
    ><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  ),
  info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" class="text-sky-500" aria-hidden="true"><circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
  ),
  loading: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      class="animate-spin text-muted-foreground" aria-hidden="true"
    ><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
  ),
};
