/**
 * The document every server-rendered page is wrapped in.
 *
 * Handed the page's markup and its data. The `content` arrives as `raw`, so
 * it goes in as markup rather than being escaped like every other value —
 * which is the one place in a page where that is right, and the reason it is
 * a separate step rather than something a page could do to itself.
 *
 * `sluurp-nav` and `sluurp-partial` are what let a rendered page, a static
 * file and a single-page app navigate between each other without a reload:
 * only the partial is swapped, so the header and anything living in it
 * survives the trip.
 */

export function render(state, html) {
  const title = state.data?.title ?? "Sluurp";
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/_/theme.css">
<link rel="stylesheet" href="/_/tw.css">
</head>
<body sluurp-nav class="bg-background text-foreground">
  <header class="border-b">
    <nav class="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4 text-sm">
      <a href="/routes-demo" class="font-semibold">Rendered</a>
      <a href="/routes-demo/posts/hello" class="text-muted-foreground hover:text-foreground">A post</a>
      <a href="/kit.html" class="text-muted-foreground hover:text-foreground">A static page</a>
      <span class="ml-auto text-xs text-muted-foreground">this header is never re-rendered</span>
    </nav>
  </header>
  <main sluurp-partial="content" class="mx-auto max-w-2xl px-6 py-10">${state.content}</main>
</body>
</html>`;
}
