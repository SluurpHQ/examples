"use client";
// Notes kept current as they are added, here or anywhere.
import { useLive } from "@sluurp/react";

export function LiveNotes() {
  const { rows } = useLive<{ id: string; title: string }>("notes", { sort: "title" });
  return <ul className="live-notes">{rows.map((n) => <li key={n.id}>{n.title}</li>)}</ul>;
}
