// Around every page: the header, the page, the footer.
export function render(state, html) {
  const title = state.data?.title ? `${state.data.title} · Acme` : "Acme";
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/_/theme.css">
<link rel="stylesheet" href="/_/tw.css">
<link rel="stylesheet" href="/site.css">
</head>
<body sluurp-nav class="bg-background text-foreground antialiased">
  <header class="border-b">
    <nav class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 text-sm">
      <a href="/" class="font-semibold">Acme</a>
      <a href="/docs" class="text-muted-foreground hover:text-foreground">Docs</a>
    </nav>
  </header>
  <div sluurp-partial="content">${state.content}</div>
  <footer class="mx-auto max-w-5xl border-t px-4 py-6 text-xs text-muted-foreground">Made with Sluurp.</footer>
</body>
</html>`;
}
