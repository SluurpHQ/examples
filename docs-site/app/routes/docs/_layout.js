// Around every page in /docs: a sidebar made from the Markdown pages beside
// this file, grouped by each one's `section` and in its `order`.
export function render(state, html) {
  const pages = state.pages ?? [];
  const sections = [...new Set(pages.map((p) => p.section ?? "More"))].map((name) => ({
    name,
    pages: pages.filter((p) => (p.section ?? "More") === name),
  }));
  return html`<div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[12rem_1fr]">
  <nav class="text-sm">${sections.map((s) => html`
    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">${s.name}</p>
    <ul class="mb-6">${s.pages.map((p) => html`
      <li><a href="${p.url}" class="${`block rounded-md px-2 py-1 ${p.url === state.url ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}">${p.title}</a></li>`)}
    </ul>`)}
  </nav>
  <article class="prose min-w-0">${state.content}</article>
</div>`;
}
