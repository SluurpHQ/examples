// Around every page: its document, styles and language.
export function render(state, html) {
  const title = state.data?.title ? `${state.data.title} · Blog` : "Blog";
  return html`<!doctype html>
<html lang="${state.url.split("/")[1] || "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/_/tw.css">
<link rel="stylesheet" href="/_/theme.css">
</head>
<body class="bg-background text-foreground antialiased">${state.content}</body>
</html>`;
}
