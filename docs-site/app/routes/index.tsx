import { Button } from "@/components/ui/button";

const FEATURES = [
  { name: "Rendered on the server", text: "Pages arrive finished: fast, and readable by search engines." },
  { name: "Docs in Markdown", text: "A new page is a new file; the sidebar follows." },
  { name: "Islands", text: "JavaScript loads only where something moves." },
];

export default () => (
  <main className="mx-auto max-w-5xl px-4 py-16">
    <h1 className="max-w-xl text-4xl font-bold tracking-tight text-balance">The product, explained in one page.</h1>
    <p className="mt-4 max-w-xl text-lg text-muted-foreground">A landing page and its docs, published as plain files.</p>
    <Button className="mt-8" render={<a href="/docs" />}>Read the docs</Button>
    <div className="mt-16 grid gap-4 sm:grid-cols-3">
      {FEATURES.map((f) => (
        <div key={f.name} className="rounded-xl border p-5">
          <h2 className="font-semibold">{f.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
        </div>
      ))}
    </div>
  </main>
);
