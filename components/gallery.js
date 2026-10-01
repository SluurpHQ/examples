/**
 * The shell every gallery page uses.
 *
 * Here so the rhythm is decided once. Five pages each inventing their own
 * spacing is five pages that disagree, and the disagreement shows most in
 * the places where a component is being judged against a reference.
 *
 * # The scale
 *
 * One ratio, used all the way down, so that every gap is a multiple of the
 * one above it and nothing sits at a distance that had to be chosen:
 *
 *     page padding      64px   py-16
 *     between sections  40px   py-10, split evenly either side of the rule
 *     heading to note    6px   mt-1.5
 *     note to examples  24px   mt-6
 *     between examples  16px   gap-4
 *
 * The section padding is *equal* above and below its rule rather than
 * bunched under the heading, because a rule with more space on one side
 * reads as belonging to whichever side has less — and then the whole page
 * looks as though it is drifting upward.
 *
 * # The type
 *
 * Three sizes and no more: the page title, the section titles, and the body.
 * Notes are `text-sm`, not `text-xs`. Explanatory prose set smaller than the
 * interface it is explaining is prose nobody reads, and a page where
 * everything is small has no hierarchy at all — only quiet.
 *
 * `max-w-prose` on the notes for the same reason a book is not a metre wide:
 * past about seventy-five characters the eye loses the start of the next
 * line.
 */

import { html } from "sluurp/ui";

/**
 * One section: a heading, a note, and the things being shown.
 *
 * `items-center` on the row, so a badge, a button and a line of text in the
 * same row sit on one axis rather than on their own tops. `items-start` is
 * the exception and has to be asked for — a row of cards of different
 * heights should hang from the top.
 */
export function section(title, note, children, { align = "center" } = {}) {
  // `section(title, children)` as well as `section(title, note, children)`.
  // A note is the common case and an optional middle argument is the usual
  // way to say so; making every caller write `null` for the ones that have
  // nothing to explain is noise in the place it is least wanted.
  if (children === undefined) {
    children = note;
    note = undefined;
  }

  // `section(title, children)` as well as `section(title, note, children)`.
  // A note is the common case and an optional middle argument is the usual
  // way to say so; making every caller write `null` for the ones that have
  // nothing to explain is noise in the place it is least wanted.
  if (children === undefined) {
    children = note;
    note = undefined;
  }

  return html`
    <section class="border-t border-border py-10">
      <h2 class="text-lg font-semibold tracking-tight">${title}</h2>
      ${note
        ? html`<p class="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            ${note}
          </p>`
        : ""}
      <div
        class="mt-6 flex flex-wrap gap-4 ${align === "start" ? "items-start" : "items-center"}"
      >${children}</div>
    </section>
  `;
}

/** A section whose contents want the full width rather than a wrapping row. */
export function wide(title, note, children) {
  return html`
    <section class="border-t border-border py-10">
      <h2 class="text-lg font-semibold tracking-tight">${title}</h2>
      ${note
        ? html`<p class="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            ${note}
          </p>`
        : ""}
      <div class="mt-6">${children}</div>
    </section>
  `;
}

/**
 * The page.
 *
 * The header has the same 40px below it that separates the sections, so the
 * first rule is the same distance from the title as every later rule is from
 * the section above it.
 */
export function page(title, lead, children) {
  return html`
    <div class="mx-auto max-w-3xl px-6 py-16">
      <header class="pb-10">
        <h1 class="text-3xl font-semibold tracking-tight">${title}</h1>
        ${lead ? html`<p class="mt-2 text-base text-muted-foreground">${lead}</p>` : ""}
      </header>
      ${children}
    </div>
  `;
}

/** A caption beside an example: metadata, so this is where `text-xs` belongs. */
export function note(children) {
  return html`<span class="text-xs text-muted-foreground">${children}</span>`;
}
