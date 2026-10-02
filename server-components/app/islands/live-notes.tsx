// A server function whose result stays current: the notes, kept by the page's sync connection.
import { signal } from "sluurp/reactive";

export async function recent() {
  "use server";
  "allow:";
  return server.live("notes", { sort: "title" });
}

export default function LiveNotes() {
  const notes = signal<{ read: () => { title: string }[] } | null>(null);
  recent().then((read) => notes.set({ read }));
  return <ul class="live-notes">{(notes()?.read() ?? []).map((n) => <li>{n.title}</li>)}</ul>;
}
