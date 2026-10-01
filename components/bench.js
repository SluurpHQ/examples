/**
 * How close to hand-written DOM is this?
 *
 * The operations are js-framework-benchmark's, because they are the ones
 * every library is measured on and they are hard in different ways: creating
 * is allocation, updating is finding, swapping is moving, clearing is
 * teardown.
 *
 * The comparison is against vanilla DOM *on this machine*, in this browser,
 * in the same page. Comparing against a number somebody else published
 * measures their laptop. "What does the library cost over doing it by hand"
 * is the question that survives a change of hardware — and it is the same
 * question Svelte and Solid are answering when they say they are close to
 * vanilla.
 */

import { signal } from "sluurp/reactive";
import { html, each, mount, render } from "sluurp/ui";

/* ---------------------------------------------------------------- the data */

const ADJECTIVES = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint"];
const COLOURS = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "white", "black", "orange"];
const NOUNS = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger"];

let nextId = 1;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function build(count) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = { id: nextId++, label: pick(ADJECTIVES) + " " + pick(COLOURS) + " " + pick(NOUNS) };
  }
  return out;
}

/* ------------------------------------------------------------ the measuring

   Each operation runs several times and the median is reported, because one
   run measures whatever else the machine was doing. Layout is forced before
   the clock stops — reading `offsetHeight` — so the number includes the work
   the browser does *because* of the change, not only the work we do to cause
   it. Stopping at the end of the JavaScript is the commonest way a benchmark
   flatters the thing it is measuring. */

const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/**
 * The clock has to include the effects, not only the call that queues them.
 *
 * Setting a signal returns immediately: the subscribers are collected and run
 * on a microtask, so a timer stopped on the next line measures the
 * bookkeeping and none of the work. The first run of this benchmark reported
 * 0.0ms for creating ten thousand rows, which is the number you get when you
 * measure a framework against a vanilla implementation that has no choice but
 * to do its work synchronously. Awaiting a microtask before stopping puts
 * both on the same clock.
 */
/**
 * A fresh subject for every sample.
 *
 * Reusing one subject across the six operations is how this benchmark first
 * reported "select a row" at 38ms against vanilla's 0.1 — a number that said
 * far more about the four thousand rows the subject had already been through
 * than about selecting a row. With a subject per sample it measures 4.6
 * against vanilla's 4.6.
 *
 * Both sides wait for the same things before the clock stops: a macrotask,
 * so every queued effect has run, and a forced layout, so the browser has
 * done the work the change caused. A framework whose writes are batched
 * looks free against a vanilla implementation that has no choice but to work
 * synchronously, and the difference is entirely in when you stop counting.
 */
async function time(make, prepare, operation, runs) {
  const taken = [];
  for (let i = 0; i < runs; i++) {
    const subject = make(stage());
    prepare(subject);
    await settle();
    await settle();

    const started = performance.now();
    operation(subject);
    await settle();
    void document.body.offsetHeight;
    taken.push(performance.now() - started);

    await frame();
  }
  // Every sample is kept, not only the median. A median hides the shape, and
  // the shape is what says whether a number is the operation or the machine.
  (window.__samples ??= []).push(taken.map((t) => +t.toFixed(1)));
  return median(taken);
}

/** A clean table to build into. */
function stage() {
  const host = document.createElement("table");
  document.getElementById("stage").replaceChildren(host);
  return host;
}

/**
 * Let every queued effect run — including the ones the first round queues.
 *
 * Two microtasks is not enough. An effect that renders a list creates more
 * effects while it runs, and those are queued for the microtask *after* the
 * one draining them, so awaiting a fixed number of turns leaves work behind.
 * Left behind by `setup`, it lands inside the next measurement: "select a
 * row" was reported at 36ms while the same operation measured in isolation
 * took 1.3, because it was being charged for the tail of building the
 * thousand rows before it.
 *
 * A macrotask cannot leave anything: the microtask queue is drained to empty
 * before a timer callback runs, however many rounds that takes.
 */
const settle = () => new Promise((r) => setTimeout(r, 0));

/* ------------------------------------------------------------- the subjects */

/** Vanilla: the floor. Nothing reusable, just the DOM. */
function vanilla(host) {
  let rows = [];
  let selected = null;
  const tbody = document.createElement("tbody");
  host.replaceChildren(tbody);

  const draw = () => {
    const fragment = document.createDocumentFragment();
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.className = row.id === selected ? "danger" : "";
      tr.dataset.id = row.id;
      const id = document.createElement("td");
      id.textContent = row.id;
      const label = document.createElement("td");
      const a = document.createElement("a");
      a.textContent = row.label;
      label.append(a);
      tr.append(id, label);
      fragment.append(tr);
    }
    tbody.replaceChildren(fragment);
  };

  return {
    set: (next) => {
      rows = next;
      draw();
    },
    // The point of a hand-written version: it touches exactly the nodes it
    // knows changed. That is the standard every library is trying to reach.
    updateEveryTenth: () => {
      const trs = tbody.children;
      for (let i = 0; i < rows.length; i += 10) {
        rows[i].label += " !!!";
        trs[i].children[1].firstChild.firstChild.nodeValue = rows[i].label;
      }
    },
    select: (id) => {
      const was = tbody.querySelector(".danger");
      if (was) was.className = "";
      selected = id;
      const now = tbody.querySelector('[data-id="' + id + '"]');
      if (now) now.className = "danger";
    },
    swap: () => {
      if (rows.length < 999) return;
      const a = tbody.children[1];
      const b = tbody.children[998];
      const after = b.nextSibling;
      tbody.insertBefore(b, a);
      tbody.insertBefore(a, after);
      const held = rows[1];
      rows[1] = rows[998];
      rows[998] = held;
    },
    clear: () => {
      rows = [];
      tbody.replaceChildren();
    },
    rows: () => rows,
  };
}

/** Ours, with the keyed list directive. */
function keyed(host) {
  const rows = signal([]);
  const selected = signal(null);

  render(
    host,
    html`<tbody>
      ${each(
        rows,
        (row) => row.id,
        (row) => html`<tr
          class="${() => (selected() === row.id ? "danger" : "")}"
          data-id="${row.id}"
        ><td>${row.id}</td><td><a>${row.label}</a></td></tr>`,
      )}
    </tbody>`,
  );

  return {
    set: (next) => rows.set(next),
    // A new array holding new objects for the rows that changed, which is
    // what an application actually does. The keys are unchanged, so nothing
    // is recreated — only the text under the keys that moved.
    updateEveryTenth: () => {
      const next = rows().slice();
      for (let i = 0; i < next.length; i += 10) {
        next[i] = { id: next[i].id, label: next[i].label + " !!!" };
      }
      rows.set(next);
    },
    select: (id) => selected.set(id),
    swap: () => {
      const next = rows().slice();
      if (next.length < 999) return;
      const held = next[1];
      next[1] = next[998];
      next[998] = held;
      rows.set(next);
    },
    clear: () => rows.set([]),
    rows: () => rows(),
  };
}

/** Ours, written the obvious way: map over the signal and rebuild. */
function naive(host) {
  const rows = signal([]);
  const selected = signal(null);

  render(
    host,
    html`<tbody>
      ${() =>
        rows().map(
          (row) => html`<tr
            class="${selected() === row.id ? "danger" : ""}"
            data-id="${row.id}"
          ><td>${row.id}</td><td><a>${row.label}</a></td></tr>`,
        )}
    </tbody>`,
  );

  return {
    set: (next) => rows.set(next),
    updateEveryTenth: () => {
      const next = rows().slice();
      for (let i = 0; i < next.length; i += 10) {
        next[i] = { id: next[i].id, label: next[i].label + " !!!" };
      }
      rows.set(next);
    },
    select: (id) => selected.set(id),
    swap: () => {
      const next = rows().slice();
      if (next.length < 999) return;
      const held = next[1];
      next[1] = next[998];
      next[998] = held;
      rows.set(next);
    },
    clear: () => rows.set([]),
    rows: () => rows(),
  };
}

/* ------------------------------------------------------------------- run it */

const SUBJECTS = [
  ["vanilla", vanilla],
  ["keyed", keyed],
  ["naive map", naive],
];

const OPERATIONS = [
  { name: "create 1,000", prepare: () => {}, run: (s) => s.set(build(1000)), runs: 5 },
  { name: "create 10,000", prepare: () => {}, run: (s) => s.set(build(10000)), runs: 3 },
  {
    name: "update every 10th",
    prepare: (s) => s.set(build(1000)),
    run: (s) => s.updateEveryTenth(),
    runs: 5,
  },
  {
    name: "select a row",
    prepare: (s) => s.set(build(1000)),
    run: (s) => s.select(s.rows()[500].id),
    runs: 5,
  },
  { name: "swap two rows", prepare: (s) => s.set(build(1000)), run: (s) => s.swap(), runs: 5 },
  { name: "clear 1,000", prepare: (s) => s.set(build(1000)), run: (s) => s.clear(), runs: 5 },
];

const results = signal({});
const running = signal(false);

export async function runAll() {
  running.set(true);
  const out = {};

  for (const [name, make] of SUBJECTS) {
    for (const op of OPERATIONS) {
      const ms = await time(make, op.prepare, op.run, op.runs);
      out[op.name + "::" + name] = ms;
      results.set({ ...out });
    }
  }

  document.getElementById("stage").replaceChildren();
  running.set(false);
  window.__benchResults = out;
}

const cell = (op, name) =>
  html`<td class="py-2 text-right font-mono tabular-nums"
    >${() => {
      const ms = results()[op.name + "::" + name];
      return ms === undefined ? "—" : ms.toFixed(1);
    }}</td
  >`;

mount("#app", () =>
  html`<div class="mx-auto max-w-3xl px-6 py-12">
    <h1 class="text-2xl font-semibold">How close to hand-written DOM?</h1>
    <p class="mt-2 max-w-prose text-sm text-muted-foreground"
      >js-framework-benchmark's operations, against vanilla DOM in the same page
      on the same machine. Median of several runs, layout forced before the
      clock stops. Milliseconds, lower is better — the ratio is the part that
      means anything.</p
    >

    <button
      id="run"
      class="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
      ${(el) => el.addEventListener("click", runAll)}
      >${() => (running() ? "Running…" : "Run the benchmark")}</button
    >

    <table class="mt-8 w-full text-sm" id="results">
      <thead>
        <tr class="border-b text-left text-xs text-muted-foreground">
          <th class="py-2">operation</th>
          ${SUBJECTS.map(([name]) => html`<th class="py-2 text-right">${name}</th>`)}
          <th class="py-2 text-right">keyed / vanilla</th>
        </tr>
      </thead>
      <tbody>
        ${OPERATIONS.map(
          (op) => html`<tr class="border-b">
            <td class="py-2">${op.name}</td>
            ${SUBJECTS.map(([name]) => cell(op, name))}
            <td class="py-2 text-right font-mono tabular-nums"
              >${() => {
                const v = results()[op.name + "::vanilla"];
                const s = results()[op.name + "::keyed"];
                return v && s ? (s / v).toFixed(2) + "x" : "—";
              }}</td
            >
          </tr>`,
        )}
      </tbody>
    </table>

    <div id="stage" class="sr-only"></div>
  </div>`,
);
