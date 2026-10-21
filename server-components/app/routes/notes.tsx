// A server component: drawn to HTML on the server, with no JavaScript sent but its client components'.
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Title } from "../components/title.tsx";
import { AddNote, total } from "../components/add-note.tsx";
import { LiveNotes } from "../components/live-notes.tsx";
import { SearchBox } from "../components/search-box.tsx";
import { Counter } from "../components/counter.tsx";
import Stars from "../islands/stars.tsx";

/** Any component can be async and wait for its data. */
async function Newest() {
  const page = await server.collection("notes").list({ sort: "title" });
  return <ul className="notes">{page.items.map((n: { id: string; title: string }) => <li key={n.id}>{n.title}</li>)}</ul>;
}

export default async function Page({ query }: { query: Record<string, string> }) {
  const count = await total();
  return (
    <main>
      <Title text={query.title ?? "Notes"} />
      <Card className="p-4">
        <Badge>{count} notes</Badge>
        <Newest />
      </Card>
      <AddNote start={count} since={new Date(Date.UTC(2026, 8, 1))}>
        <em>Written on the server.</em>
      </AddNote>
      <LiveNotes />
      <SearchBox />
      <Counter start={count} />
      <Stars start={3} />
    </main>
  );
}
