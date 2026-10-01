/**
 * The typeset playground.
 *
 * Every knob the stylesheet exposes, over content that uses every tag a
 * Markdown renderer emits. The point of building it is that the variables
 * are the whole interface — if a preset is nothing but six values, then a
 * page with six controls is the complete documentation.
 *
 * The state lives in the query string, so a particular setting is a link.
 * That is not decoration: "this reads better at 90 characters" is an
 * argument somebody has to be able to send to somebody else.
 */

import { signal, computed, effect } from "sluurp/reactive";
import { html, mount, on, prop, each } from "sluurp/ui";
import { cn } from "sluurp/cn";

/* ------------------------------------------------------------- the knobs */

const FONTS = {
  body: [
    { value: "noto-serif", label: "Noto Serif", stack: '"Noto Serif", Georgia, serif' },
    { value: "space-grotesk", label: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif' },
    { value: "system", label: "System", stack: "var(--sans, system-ui), sans-serif" },
  ],
  heading: [
    { value: "space-grotesk", label: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif' },
    { value: "noto-serif", label: "Noto Serif", stack: '"Noto Serif", Georgia, serif' },
    { value: "inherit", label: "Same as body", stack: "var(--typeset-font-body)" },
  ],
};

const DEFAULTS = {
  body: "noto-serif",
  heading: "space-grotesk",
  measure: "68",
  flow: "1.4em",
  size: "17",
  leading: "1.75",
  item: "article",
};

/** Read the settings out of the URL, so a link carries them. */
const fromUrl = () => {
  const params = new URLSearchParams(location.search);
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  return out;
};

const settings = signal(fromUrl());

const set = (key, value) => {
  settings.update((current) => ({ ...current, [key]: value }));
};

// Written back on every change, replacing rather than pushing: twenty history
// entries from dragging one slider is a back button that does not work.
effect(() => {
  const current = settings();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value !== DEFAULTS[key]) params.set(key, value);
  }
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
});

/** The six variables, as an inline style for the container. */
const style = computed(() => {
  const s = settings();
  const body = FONTS.body.find((f) => f.value === s.body) ?? FONTS.body[0];
  const heading = FONTS.heading.find((f) => f.value === s.heading) ?? FONTS.heading[0];
  return [
    `--typeset-font-body: ${body.stack}`,
    `--typeset-font-heading: ${heading.stack}`,
    `--typeset-size: ${s.size}px`,
    `--typeset-leading: ${s.leading}`,
    `--typeset-flow: ${s.flow}`,
    `--typeset-measure: ${s.measure}ch`,
  ].join("; ");
});

/* ------------------------------------------------------------- controls */

const label = (text) =>
  html`<span class="text-xs font-medium text-muted-foreground">${text}</span>`;

const choice = ({ name, options, value }) => html`
  <div class="flex flex-col gap-1.5">
    ${label(name)}
    <div class="inline-flex rounded-md border border-input p-0.5 gap-0.5">
      ${options.map(
        (option) => html`
          <button
            type="button"
            class="${computed(() =>
              cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                value() === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              ),
            )}"
            ${prop("ariaPressed", () => String(value() === option.value))}
            ${on("click", () => option.onSelect())}
          >${option.label}</button>
        `,
      )}
    </div>
  </div>
`;

const slider = ({ name, key, min, max, step, format }) => html`
  <div class="flex flex-col gap-1.5">
    <span class="flex items-baseline gap-2">
      ${label(name)}
      <span class="text-xs tabular-nums text-foreground"
        >${computed(() => format(settings()[key]))}</span
      >
    </span>
    <input
      type="range"
      class="w-40 accent-primary"
      ${prop("min", String(min))} ${prop("max", String(max))} ${prop("step", String(step))}
      ${prop("value", () => settings()[key])}
      ${prop("ariaLabel", name)}
      ${on("input", (e) => set(key, e.target.value))}
    >
  </div>
`;

/* --------------------------------------------------------- the specimens

   One per kind of surface, because the settings that suit a textbook do not
   suit a message and the difference only shows on real content. Written as
   HTML rather than Markdown on purpose: HTML is what a renderer hands the
   container, and rendering Markdown here would be testing the renderer. */

const ARTICLE = `
<h1>The water cycle</h1>
<p>Water moves between the sea, the sky and the land without ever leaving the
planet. The same water that falls on a playground in <em>Springfield</em> was,
some weeks earlier, part of an ocean — and will be again.</p>

<h2>Evaporation</h2>
<p>The sun warms the surface of the sea. Warmed water becomes vapour and
rises, leaving its salt behind. This is why rain is fresh and the sea is
not — a fact worth stopping on, because it is the whole reason the cycle
supports life on land.</p>
<blockquote>
  <p>Nothing in nature is wasted. What leaves one place arrives in another.</p>
</blockquote>

<h3>What to look for</h3>
<ul>
  <li>Haze over warm water on a still morning</li>
  <li>Clouds forming on the windward side of a hill
    <ul>
      <li>Thicker where the slope is steeper</li>
      <li>Thinner once the air has crossed the ridge</li>
    </ul>
  </li>
  <li>Dew on grass that was not there at midnight</li>
</ul>

<h3>Measurements from the school roof</h3>
<table>
  <thead>
    <tr><th>Month</th><th>Rainfall (mm)</th><th>Days with rain</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td>September</td><td>48</td><td>9</td><td>Two heavy afternoons</td></tr>
    <tr><td>October</td><td>76</td><td>14</td><td>Gauge overflowed once<sup><a href="#fn1">1</a></sup></td></tr>
    <tr><td>November</td><td>91</td><td>17</td><td>—</td></tr>
  </tbody>
  <caption>Measured at 9am each day by Class 4A.</caption>
</table>

<h2>Working it out</h2>
<p>To find the average daily rainfall for a month, divide the total by the
number of days. In a spreadsheet that is <code>=B2/C2</code>; by hand it is
long division and a decimal point kept in the right place.</p>
<pre><code>total  = 76 mm
days   = 14
average = 76 / 14
        = 5.43 mm per rainy day</code></pre>

<h4>A note on units</h4>
<dl>
  <dt>Millimetre of rain</dt>
  <dd>The depth the water would reach if none of it drained away.</dd>
  <dt>Litre per square metre</dt>
  <dd>The same quantity, differently named. One millimetre is one litre.</dd>
</dl>

<hr>

<p>Press <kbd>Ctrl</kbd> + <kbd>P</kbd> to print this page for the field
notebook. The <mark>highlighted</mark> rows are the ones to copy out.
<del>Bring an umbrella.</del> Bring a coat.</p>

<details>
  <summary>Answers to the exercises</summary>
  <p>1. 5.3 mm &nbsp; 2. November &nbsp; 3. Because the salt is left behind.</p>
</details>

<p id="fn1"><sup>1</sup> The reading for 14 October is a minimum, not a
measurement. See <a href="#">the class log</a>.</p>
`;

const MESSAGE = `
<p>Dear parents,</p>
<p>The trip to the coast is confirmed for <strong>Friday 14 November</strong>.
We leave at 8:15 sharp and return by 4pm.</p>
<p>Please make sure your child brings:</p>
<ul>
  <li>A waterproof coat — we are going whatever the weather</li>
  <li>A packed lunch and a full water bottle</li>
  <li>The signed permission slip, if you have not returned it already</li>
</ul>
<p>If the slip has gone missing, reply to this message and I will send
another. Please do not reply to the email notification — it does not reach
anybody.</p>
<p>Edna Krabappel<br>Class 4A</p>
`;

const README = `
<h1>sluurp</h1>
<p>A backend in one binary. No runtime to install, no services to wire
together, no <code>node_modules</code>.</p>
<h2>Install</h2>
<pre><code>curl -fsSL https://example.invalid/install.sh | sh
sluurp serve --public ./app</code></pre>
<h2>What you get</h2>
<ol>
  <li>A database, with an admin UI at <code>/_/</code></li>
  <li>A REST API with rules written as filters</li>
  <li>Realtime, over SSE or a socket</li>
</ol>
<blockquote>
  <p><strong>Note:</strong> the first run creates an administrator. Nothing
  else is reachable until it does.</p>
</blockquote>
<h3>Rules</h3>
<p>A rule is a filter evaluated against the row as written, so
<code>created_by = @request.auth.id</code> is both a permission and a
constraint.</p>
`;

const SPECIMENS = {
  article: { label: "Article", body: ARTICLE },
  message: { label: "Message", body: MESSAGE },
  readme: { label: "README", body: README },
};

/* ------------------------------------------------------------------ page */

const controls = () => html`
  <div class="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
    <div class="mx-auto flex max-w-5xl flex-wrap items-end gap-6 px-6 py-4">
      ${choice({
        name: "Specimen",
        value: () => settings().item,
        options: Object.entries(SPECIMENS).map(([value, s]) => ({
          value,
          label: s.label,
          onSelect: () => set("item", value),
        })),
      })}
      ${choice({
        name: "Body",
        value: () => settings().body,
        options: FONTS.body.map((f) => ({ ...f, onSelect: () => set("body", f.value) })),
      })}
      ${choice({
        name: "Heading",
        value: () => settings().heading,
        options: FONTS.heading.map((f) => ({ ...f, onSelect: () => set("heading", f.value) })),
      })}
      ${slider({ name: "Size", key: "size", min: 13, max: 22, step: 1, format: (v) => `${v}px` })}
      ${slider({ name: "Leading", key: "leading", min: 1.2, max: 2.2, step: 0.05, format: (v) => Number(v).toFixed(2) })}
      ${slider({ name: "Measure", key: "measure", min: 40, max: 110, step: 1, format: (v) => `${v}ch` })}
      ${choice({
        name: "Flow",
        value: () => settings().flow,
        options: ["1em", "1.4em", "2em"].map((value) => ({
          value,
          label: value,
          onSelect: () => set("flow", value),
        })),
      })}
    </div>
  </div>
`;

/**
 * The container itself.
 *
 * Rebuilt whenever the specimen changes, and only then: the settings are CSS
 * variables, so changing a font or the leading re-styles what is already
 * there rather than re-rendering it. That is the argument for variables over
 * classes, and it is visible here as the text not flickering.
 */
const specimen = () => html`
  <div class="mx-auto max-w-5xl px-6 py-10">
    <!-- The content is written straight onto the container, not into a
         wrapper inside it. A wrapper becomes the first child even when it is
         display:contents, and the rule that strips the leading margin then
         applies to the wrapper instead of to the heading — leaving a gap
         above every document that nobody can find the source of. -->
    <article class="typeset" ${prop("style", style)}
             ${(element) => {
               effect(() => {
                 // Set as HTML because that is what a Markdown renderer
                 // hands over, and the point of `.typeset` is that it needs
                 // no classes on any of it.
                 element.innerHTML = SPECIMENS[settings().item]?.body ?? "";
               });
             }}></article>

    <!-- The opt-out, demonstrated rather than described: this is inside the
         container and keeps its own styling completely. -->
    <div class="not-typeset mt-10 rounded-lg border border-border p-4">
      <p class="text-xs text-muted-foreground">
        This box is inside the container and carries <code
          class="rounded bg-muted px-1 py-0.5 font-mono text-xs">not-typeset</code>,
        so none of the rules above reach it — which is how an interactive
        component embedded in a document keeps its own look.
      </p>
    </div>
  </div>
`;

mount("#app", () => html`${controls()}${specimen()}`);
