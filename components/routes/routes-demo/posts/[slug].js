/**
 * A dynamic route: the file is `[slug].js` and the segment is the parameter.
 *
 * A literal file would win over this one — `posts/new.js` answers `/posts/new`
 * whatever order the directory happened to list them in — so the specific
 * page never has to worry about the general one shadowing it.
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
    title: `Post: ${ctx.params.slug}`,
    slug: ctx.params.slug,
    highlight: ctx.query.highlight ?? "",
  };
}

export function render(data, html) {
  return html`<article class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">${data.title}</h1>
    <p class="text-sm text-muted-foreground"
      >The slug came out of the URL, percent-decoded, and the query string is
      handed over beside it.</p
    >
    <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
      <dt class="text-muted-foreground">slug</dt><dd class="font-mono">${data.slug}</dd>
      <dt class="text-muted-foreground">highlight</dt>
      <dd class="font-mono">${data.highlight || "—"}</dd>
    </dl>
    <p class="text-sm"
      >Try <code class="rounded bg-muted px-1">/routes-demo/posts/anything?highlight=yes</code>.</p
    >
  </article>`;
}
