// A server component: rendered to HTML on the server, no JavaScript sent
// but for the islands in it. Anyone may read it.
export const rule = "";

import { Badge } from "sluurp/kit/badge.js";
import { Card } from "sluurp/kit/card.js";
import { Sluurp } from "sluurp";
import { Title } from "../components/title.tsx";
import AddNote, { total } from "../islands/add-note.tsx";
import SearchBox from "../islands/search-box.tsx";
import LiveNotes from "../islands/live-notes.tsx";

/** Waits for its data, as any component may. */
async function Newest() {
  const page = await new Sluurp().collection("notes").list({ sort: "title" });
  return <ul class="notes">{page.items.map((n: { title: string }) => <li>{n.title}</li>)}</ul>;
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
      <div style={{ height: "2000px" }} />
      <SearchBox client="visible" />
    </main>
  );
}
