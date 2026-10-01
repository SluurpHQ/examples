// An island: rendered on the server with the page, then taken over by the
// browser. Its server functions run in place on the server and through
// /api/rpc from the browser, with nothing to configure.
import { signal } from "sluurp/reactive";
import { IS_BROWSER } from "sluurp/ui";

export async function total(): Promise<number> {
  "use server";
  "allow:";
  return server.collection("notes").count();
}

export async function addNote(title: string, at: Date) {
  "use server";
  "allow:";
  // `at` is a Date here, as the browser sent it: calls carry devalue.
  const made = await server.collection("notes").create({ title });
  return { made, at, next: new Date(at.getTime() + 86_400_000), tags: new Set(["new"]) };
}

export default function AddNote({ start, since, children }: { start: number; since: Date; children?: unknown }) {
  const count = signal(start);
  const said = signal("");
  const add = async () => {
    const { at, next, tags } = await addNote("From the browser", new Date(Date.UTC(2026, 8, 24)));
    said.set(`${at instanceof Date} ${next.toISOString().slice(0, 10)} ${tags instanceof Set && tags.has("new")}`);
    count.set(await total());
  };
  return (
    <section class="add-note" data-where={IS_BROWSER ? "browser" : "server"}>
      <button onClick={add}>Add a note</button> <output>{count}</output>
      <small data-since>{since instanceof Date ? since.toISOString().slice(0, 10) : "not a date"}</small>
      <small data-said>{said}</small>
      {children}
    </section>
  );
}
