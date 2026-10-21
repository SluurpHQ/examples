# Sluurp examples

Small apps built with [Sluurp](https://github.com/SluurpHQ/releases), in React. Each is a folder: install its packages, then serve it.

```sh
cd todos/app && bun install
sluurp serve --public .
```

| Folder | What it shows |
| --- | --- |
| [todos](todos/app) | A to-do list everybody edits at once, with live cursors, in one component. |
| [sheet](sheet/app) | A spreadsheet several people edit at once; a cell is locked while someone types in it. |
| [docs-site](docs-site/app) | A landing page and Markdown docs with a generated sidebar, published as plain files with `sluurp static`. |
| [blog](blog/app) | Posts in two languages, tags, feeds and a sitemap, rendered on the server. |
| [server-components](server-components/app) | A server-rendered page, client components, and server functions called from the browser. |
| [wiki](wiki/app) | A whole wiki on Pages: nested pages, history, a link graph, books and PDF export. |
| [contact-form](contact-form/app) | A form built from shadcn's fields with React Hook Form; one zod schema checks it in the browser and again on the server. |
| [react-bits](react-bits/app) | A React Bits background, added with shadcn, with registry controls beside it. |
