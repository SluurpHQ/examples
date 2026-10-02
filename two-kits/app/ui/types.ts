/**
 * The types the components share.
 *
 * Small on purpose. A per-component options table written out in full is
 * several hundred lines that drift from the components the moment one
 * changes; what is worth saying is which props every component takes, and
 * that a value may be a signal wherever a value is accepted.
 */

import type { Signal } from "sluurp/reactive";
import type { Renderable } from "sluurp/ui";

/**
 * A value, a signal holding one, or a function returning one.
 *
 * Every attribute here accepts all three. That is the whole of the reactivity
 * model from a caller's side: hand a component a signal and the attribute
 * follows it, hand it a string and it never changes.
 */
export type Reactive<T> = T | Signal<T> | (() => T);

/**
 * A signal a component opens and closes.
 *
 * Read by the component and written by it — which is the whole reason it is
 * the caller's signal rather than internal state: the caller can open it too.
 */
export type OpenSignal = Signal<boolean>;

/** What a component gives back: real DOM, or a template that makes some. */
export type Rendered = Renderable;

/**
 * What every component takes.
 *
 * The index signature is how the rest reach the element: an `id`, an
 * `aria-label`, an `onClick`, a `data-*`. Typing those per component would be
 * typing the DOM by hand, and getting it wrong in a different way each time
 * the platform adds something.
 */
export interface Props {
  children?: unknown;
  /** Merged with the component's own classes, conflicts resolved by `cn`. */
  className?: Reactive<string | undefined>;
  [key: string]: unknown;
}
