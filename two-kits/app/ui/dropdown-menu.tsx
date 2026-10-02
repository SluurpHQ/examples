import { effect, onCleanup, signal, untrack } from "sluurp/reactive";
import { cn } from "sluurp/cn";
import { dismissable, portal, portalRoot, position, presence, rovingFocus, scopeFrom, uid } from "sluurp/primitives";
import { Button } from "./button.js";
import { Tooltip } from "./tooltip.js";
import { MENU_HEAD, MENU_ROW, renderInto } from "./internal.js";
import type { Props } from "./types.ts";

/* ===================================================================
   Dropdown menu
   =================================================================== */

/**
 * A menu attached to a trigger.
 *
 *     DropdownMenu({
 *       trigger: Button({ children: "Open", variant: "outline" }),
 *       items: [
 *         { label: "Profile", shortcut: "⇧⌘P", onSelect: … },
 *         { separator: true },
 *         { label: "Log out", onSelect: … },
 *       ],
 *     })
 *
 * What it does that a `<details>` does not: arrow keys move between items,
 * Home and End jump to the ends, typing a letter jumps to the next item
 * starting with it, Escape closes and returns focus to the trigger, the
 * panel flips when it would go off the bottom of the window and reports how
 * much room it has so a long menu scrolls instead of overflowing, and it is
 * rendered at the end of the body so no card with `overflow: hidden` can
 * clip it.
 */
export interface DropdownItem {
  label?: unknown;
  icon?: unknown;
  shortcut?: unknown;
  /** A second line under the label, in smaller grey words, saying what the item does. */
  description?: unknown;
  disabled?: boolean;
  /** Destroys something. Coloured accordingly, and last in its group. */
  destructive?: boolean;
  separator?: boolean;
  heading?: boolean;
  /**
   * Makes the item a checkbox item: ticked when true, and indented when
   * false so a column of choices lines up whether or not it is the one.
   */
  checked?: boolean | (() => boolean);
  /** Chosen, the menu stays open: settings ticked one after another. With a function `checked`, the tick follows. */
  keepOpen?: boolean;
  onSelect?: () => void;
}

export interface DropdownMenuProps extends Props {
  trigger?: unknown;
  triggerClassName?: string;
  /**
   * Or a function, read each time the menu opens: items that depend on
   * signals — a tick on the current language, an entry only some people get
   * — are then current when shown, without the menu being re-rendered
   * whenever one of them moves. Rendered again, an open menu is closed under
   * whoever was about to choose from it.
   */
  items?: DropdownItem[] | (() => DropdownItem[]);
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
}

export function DropdownMenu({
  trigger,
  /**
   * Classes for the wrapper the trigger sits in.
   *
   * It is `inline-flex`, so it is as wide as what is inside it — and a
   * trigger asked to be `w-full` then fills a box that is already only as
   * wide as the trigger. Something that has to span its container, like a
   * switcher at the top of a sidebar, needs the wrapper to span it too.
   */
  triggerClassName,
  items = [],
  align = "start",
  side = "bottom",
  sideOffset = 4,
  className,
}: DropdownMenuProps = {}) {
  const open = signal(false);
  const triggerId = uid("menu-trigger");
  const menuId = uid("menu");

  // A signal rather than a variable: it is found one microtask after this
  // runs, and the effect that writes the aria attributes has to run again
  // once it exists or the trigger never gets its initial `aria-expanded`.
  const triggerElement = signal<HTMLElement | null>(null);
  let mounted: any = null;

  const close = ({ restoreFocus = true } = {}) => {
    open.set(false);
    if (restoreFocus) triggerElement()?.focus({ preventScroll: true });
  };

  const buildPanel = () => {
    const panel = document.createElement("div");
    panel.id = menuId;
    panel.setAttribute("role", "menu");
    panel.setAttribute("aria-labelledby", triggerElement()?.id || triggerId);
    panel.tabIndex = -1;
    panel.className = cn(
      `
    z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem]
    overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1
    text-popover-foreground shadow-md
    data-[state=open]:animate-in data-[state=closed]:animate-out
    data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
    data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
    data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
    data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
    origin-[var(--radix-dropdown-menu-content-transform-origin)]`,
      className,
    );

    const list = untrack(() => (typeof items === "function" ? items() : items));
    // A menu with a tick anywhere keeps one column for it on every row, so
    // the labels line up whether a row can be ticked or not.
    const ticks = list.some((item) => item.checked !== undefined);
    renderInto(
      panel,
      list.map((item) => {
        if (item.separator) {
          return <div role="separator" class="-mx-1 my-1 h-px bg-muted"></div>;
        }
        if (item.label && item.heading) {
          return <div class={MENU_HEAD}>{item.label}</div>;
        }
        const act = () => {
          if (item.disabled) return;
          if (!item.keepOpen) close();
          item.onSelect?.();
        };
        const checkable = item.checked !== undefined;
        const isChecked = () => (typeof item.checked === "function" ? item.checked() : Boolean(item.checked));
        return (
          <div
            role={checkable ? "menuitemcheckbox" : "menuitem"}
            aria-checked={checkable ? () => String(isChecked()) : undefined}
            data-item
            data-disabled={item.disabled ? "" : undefined}
            aria-disabled={item.disabled ? "true" : undefined}
            data-label={item.label ?? ""}
            class={cn(
              `
    relative flex ${MENU_ROW} cursor-default select-none items-center gap-2 rounded-sm px-2
    font-sans font-normal outline-none transition-colors focus:bg-accent focus:text-accent-foreground
    data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4
    [&>svg]:shrink-0 [&>svg]:text-muted-foreground`,
              item.destructive &&
                "font-medium text-destructive focus:bg-destructive/10 focus:text-destructive [&>svg]:text-destructive",
              ticks && "pl-8",
            )}
            onClick={act}
            onKeydown={(event: KeyboardEvent) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              act();
            }}
            onPointermove={(event: PointerEvent) => {
              // Hovering moves focus, so the keyboard and the pointer never
              // disagree about which item is current — the thing that makes a
              // menu feel broken when it is missing.
              if (item.disabled) return;
              (event.currentTarget as HTMLElement).focus({ preventScroll: true });
            }}
          >
            {checkable && isChecked() ? (
              <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
            ) : ""}
            {item.icon ?? ""}
            {item.description
              ? (
                <span class="grid py-0.5">
                  <span class="leading-5">{item.label}</span>
                  <span class="text-xs leading-4 text-muted-foreground">{item.description}</span>
                </span>
              )
              : <span>{item.label}</span>}
            {item.shortcut ? (
              <span class="ml-auto text-xs tracking-widest opacity-60">{item.shortcut}</span>
            ) : ""}
          </div>
        );
      }),
    );

    return panel;
  };

  effect(() => {
    if (open() && !mounted && triggerElement()) {
      const panel = buildPanel();
      // Where its trigger is: in a story's preview, or in the page.
      const unportal = portal(panel, portalRoot(triggerElement()));
      scopeFrom(triggerElement(), panel);
      const panelPresence = presence(panel, {
        onExit: () => {
          unportal();
          mounted = null;
        },
      });

      const unposition = position(panel, triggerElement()!, {
        side,
        align,
        sideOffset,
        name: "dropdown-menu",
      });
      const roving = rovingFocus(panel, { orientation: "vertical" });
      const undismiss = dismissable(panel, {
        onDismiss: (reason: string) => {
          close({ restoreFocus: reason === "escape" });
        },
      });

      mounted = {
        panel,
        panelPresence,
        teardown: () => {
          undismiss();
          unposition();
          roving.release();
        },
      };

      panelPresence.reveal();
      roving.focusFirst();
      return;
    }

    if (!open() && mounted) {
      mounted.teardown();
      mounted.panelPresence.setOpen(false);
    }
  });

  // Taken down with whatever rendered it — a menu in a part of the screen that
  // is rebuilt (a language changed, words updated) would otherwise stay in
  // the body, open, with nothing positioning it: at the page's top-left.
  onCleanup(() => {
    const m = mounted;
    if (!m) return;
    m.teardown();
    m.panel.style.display = "none";
    m.panelPresence.setOpen(false);
  });

  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open.set(true);
    }
  };

  // An icon-only trigger — a "…" — gets its label as a tooltip, as every
  // other icon button does; one with words of its own needs none.
  const tip = signal("");
  return <Tooltip label={() => tip()} wrapperClassName={triggerClassName}>
    <span
      // Where it sits is the tooltip wrapper's, which carries
      // `triggerClassName`; this only fills it — given the placement too,
      // an `absolute top-1` was applied twice and the trigger sat low.
      class="flex w-full min-w-0"
      // And lines its trigger up as the wrapper was asked to: centred, say.
      style="justify-content: inherit; align-items: inherit"
      ref={(element: HTMLElement) => {
        // `ref` runs while the element is being wired, before the trigger has
        // been put inside it — so the child is looked for on the next
        // microtask, when it exists. Reading it now finds the wrapper, and
        // Escape then returns focus to a span nobody can see.
        queueMicrotask(() => {
          // The control itself, not something wrapped round it: a trigger
          // given inside a Tooltip is the tooltip's span first, and the
          // menu's state on a span is state nobody can reach — nor may a
          // span carry `aria-expanded` at all.
          const first = (element.firstElementChild ?? element) as HTMLElement;
          const CONTROL = "button, a[href], [role='button'], input, [tabindex]:not([tabindex='-1'])";
          const found = (first.matches(CONTROL) ? first : first.querySelector<HTMLElement>(CONTROL) ?? first);
          // A trigger that came with an id keeps it: the page may be using
          // it, and the menu only needs *an* id to be labelled by.
          if (!found.id) found.id = triggerId;
          found.setAttribute("aria-haspopup", "menu");
          if (!found.textContent?.trim()) tip.set(found.getAttribute("aria-label") ?? "");
          triggerElement.set(found);
        });
        effect(() => {
          const node = triggerElement();
          if (!node) return;
          node.setAttribute("aria-expanded", String(open()));
          if (open()) node.setAttribute("aria-controls", menuId);
          else node.removeAttribute("aria-controls");
          node.dataset.state = open() ? "open" : "closed";
        });
      }}
      onClick={() => open.set(!open())}
      onKeydown={onTriggerKey}
    >{trigger}</span>
  </Tooltip>;
}
