"use client";
// A client component: drawn on the server with the page, then taken over by the browser. Its "use server"
// functions run directly while the page is drawn, and through /api/rpc from the browser.
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export async function total(): Promise<number> {
  "use server";
  "allow:";
  return server.collection("notes").count();
}

export async function addNote(title: string, at: Date) {
  "use server";
  "allow:";
  // `at` arrives as a real Date: calls keep dates, maps and sets.
  const made = await server.collection("notes").create({ title });
  return { made, at, next: new Date(at.getTime() + 86_400_000), tags: new Set(["new"]) };
}

export function AddNote({ start, since, children }: { start: number; since: Date; children?: ReactNode }) {
  const [count, setCount] = useState(start);
  const [said, setSaid] = useState("");
  const add = async () => {
    const { at, next, tags } = await addNote("From the browser", new Date(Date.UTC(2026, 8, 24)));
    setSaid(`${at instanceof Date} ${next.toISOString().slice(0, 10)} ${tags instanceof Set && tags.has("new")}`);
    setCount(await total());
  };
  return (
    <section className="add-note">
      <Button onClick={add}>Add a note</Button> <output>{count}</output>
      <small data-since>{since instanceof Date ? since.toISOString().slice(0, 10) : "not a date"}</small>
      <small data-said>{said}</small>
      {children}
    </section>
  );
}
