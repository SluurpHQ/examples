/**
 * A page rendered on the server.
 *
 * `load` runs in QuickJS with a database handle and the caller's identity —
 * so it sees exactly the rows the API rules would let that person see, not
 * everything. `render` turns what it found into markup.
 *
 * The counter below is an island: the server sends it as HTML, and only that
 * element hydrates. Everything around it stays the HTML it arrived as, which
 * is the whole point of the arrangement.
 */

/**
 * Open to anyone.
 *
 * A page is closed by default, exactly as a function, a live view and a
 * collection are — no rule means superuser only. That is the right default
 * even though a page is a document: `load` runs server code with a database
 * handle, and a directory of files is not the place to discover that one of
 * them is a program.
 *
 * An empty rule is the way to say "anyone". It is not a loophole: whatever
 * `load` reads still goes through the caller's own identity, so a public page
 * can only show a visitor what the API would already have shown them.
 */
export const rule = "";

export function load(ctx) {
  return {
    title: "Rendered on the server",
    who: ctx.auth?.id ? ctx.auth.email : "nobody in particular",
    at: new Date().toISOString(),
    url: ctx.url,
  };
}

export function render(data, html) {
  return html`<article class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">${data.title}</h1>
    <p class="text-sm text-muted-foreground"
      >This markup was built in QuickJS and sent as HTML. No JavaScript ran in
      the browser to produce it, and none is needed to read it.</p
    >

    <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt class="text-muted-foreground">rendered at</dt><dd class="font-mono text-xs">${data.at}</dd>
      <dt class="text-muted-foreground">for</dt><dd>${data.who}</dd>
      <dt class="text-muted-foreground">url</dt><dd class="font-mono text-xs">${data.url}</dd>
    </dl>

    <div class="rounded-lg border p-4">
      <p class="mb-3 text-sm font-medium">And an island inside it</p>
      <sluurp-island src="counter" props='{"start": 7}' client="load">
        <button class="inline-flex h-9 items-center rounded-md border px-4 text-sm"
          >Clicked 7 times</button
        >
      </sluurp-island>
      <p class="mt-3 text-xs text-muted-foreground"
        >The button above is real HTML until its module loads, then it is
        hydrated in place. Nothing else on the page is touched.</p
      >
    </div>
  </article>`;
}
