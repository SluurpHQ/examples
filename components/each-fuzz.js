/**
 * Does `each` still put the rows where they belong?
 *
 * A reorder algorithm that is fast and wrong is worse than a slow one, and
 * the wrongness does not show up on the shapes anybody tests by hand — it
 * shows up on the one permutation nobody thought of. So this generates
 * thousands of them and checks the DOM against the list after each.
 *
 * Every transition is applied to the *same* list, so the state carried
 * between runs is part of what is tested: a diff that works from a clean
 * start and corrupts its bookkeeping is a diff that fails on the second
 * change rather than the first.
 */

import { signal } from "sluurp/reactive";
import { html, each, render, mount } from "sluurp/ui";

const report = signal({ ran: 0, failed: 0, worst: null, running: false });

/** A deterministic generator, so a failure can be run again. */
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

/** Every shape a list changes in, including the ones that look unlikely. */
function mutate(list, next, rnd) {
  const out = list.slice();
  const roll = Math.floor(rnd() * 10);

  if (roll === 0) return [];
  if (roll === 1) return out.reverse();
  if (roll === 2) {
    // Swap two at random — the case this was all for.
    if (out.length < 2) return out;
    const a = Math.floor(rnd() * out.length);
    const b = Math.floor(rnd() * out.length);
    const held = out[a];
    out[a] = out[b];
    out[b] = held;
    return out;
  }
  if (roll === 3) {
    // Shuffle.
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const held = out[i];
      out[i] = out[j];
      out[j] = held;
    }
    return out;
  }
  if (roll === 4) {
    // Remove a run.
    const at = Math.floor(rnd() * out.length);
    out.splice(at, 1 + Math.floor(rnd() * 3));
    return out;
  }
  if (roll === 5) {
    // Insert a run, anywhere.
    const at = Math.floor(rnd() * (out.length + 1));
    const added = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => next());
    out.splice(at, 0, ...added);
    return out;
  }
  if (roll === 6) {
    // Replace an item's data while keeping its key — the rebuild-in-place
    // path, which is easy to get wrong in a diff that only thinks about
    // position.
    if (!out.length) return out;
    const at = Math.floor(rnd() * out.length);
    out[at] = { id: out[at].id, label: out[at].label + "*" };
    return out;
  }
  if (roll === 7) return [...out, next(), next()];
  if (roll === 8) return [next(), ...out];
  return out.slice(Math.floor(rnd() * 2), out.length - Math.floor(rnd() * 2));
}

async function fuzz() {
  report.set({ ...report(), running: true, failed: 0, ran: 0 });

  let ran = 0;
  let failed = 0;
  let worst = null;

  for (let seed = 1; seed <= 200; seed++) {
    const size = 1 + (seed % 12);
    const failures = await rounds(40, size, seed);
    ran += 40;
    if (failures.length) {
      failed += failures.length;
      worst ??= { seed, size, ...failures[0] };
    }
    if (seed % 20 === 0) {
      report.set({ ran, failed, worst, running: true });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  report.set({ ran, failed, worst, running: false });
  window.__fuzz = { ran, failed, worst };
}

/**
 * Apply `rounds` changes to one list, checking the DOM after each.
 *
 * Yields between rounds on purpose. Effects are batched onto a microtask, so
 * a synchronous loop would never let them run: every intermediate state would
 * be skipped and the whole thing would test one transition instead of forty.
 */
async function rounds(count, size, seed) {
  const rnd = random(seed);
  const host = document.getElementById("stage");
  host.replaceChildren();

  const before = document.createElement("p");
  before.id = "before";
  const after = document.createElement("p");
  after.id = "after";
  const box = document.createElement("div");
  host.append(before, box, after);

  const rows = signal([]);
  render(
    box,
    html`<span id="head">[</span>${each(
      rows,
      (row) => row.id,
      (row) => html`<i data-id="${row.id}">${row.label}</i>`,
    )}<span id="tail">]</span>`,
  );

  let id = 1;
  const next = () => ({ id: id++, label: "r" + id });
  rows.set(Array.from({ length: size }, next));
  await tick();

  const failures = [];

  for (let round = 0; round < count; round++) {
    const wanted = mutate(rows(), next, rnd);
    rows.set(wanted);
    await tick();

    const got = [...box.querySelectorAll("i")].map((node) => ({
      id: Number(node.dataset.id),
      label: node.textContent,
    }));

    const same =
      got.length === wanted.length &&
      got.every((row, i) => row.id === wanted[i].id && row.label === wanted[i].label);

    const framed =
      box.firstChild?.id === "head" &&
      box.lastChild?.id === "tail" &&
      host.firstChild === before &&
      host.lastChild === after;

    if (!same || !framed) {
      failures.push({
        round,
        wanted: wanted.map((r) => r.id).join(","),
        got: got.map((r) => r.id).join(","),
        framed,
      });
      if (failures.length > 3) break;
    }
  }

  host.replaceChildren();
  return failures;
}

const tick = () => new Promise((r) => queueMicrotask(() => queueMicrotask(r)));

mount("#app", () =>
  html`<div class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="text-2xl font-semibold">Does the list end up right?</h1>
    <p class="mt-2 max-w-prose text-sm text-muted-foreground"
      >Eight thousand transitions — reversals, shuffles, swaps, runs inserted
      and removed at every position, and data replaced under an unchanged key —
      each applied to the list the last one left behind, with the DOM checked
      against the list every time.</p
    >

    <button
      id="fuzz"
      class="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      ${(el) => el.addEventListener("click", fuzz)}
      >${() => (report().running ? "Running…" : "Run the fuzzer")}</button
    >

    <dl class="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt class="text-muted-foreground">transitions</dt>
      <dd class="font-mono tabular-nums" id="ran">${() => report().ran}</dd>
      <dt class="text-muted-foreground">wrong</dt>
      <dd
        class="${() => "font-mono tabular-nums " + (report().failed ? "text-destructive" : "")}"
        id="failed"
        >${() => report().failed}</dd
      >
    </dl>

    <pre
      class="mt-4 overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs"
      id="worst"
      >${() => (report().worst ? JSON.stringify(report().worst, null, 2) : "—")}</pre
    >

    <div id="stage" class="sr-only"></div>
  </div>`,
);
