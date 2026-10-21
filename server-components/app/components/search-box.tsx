"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchBox() {
  const [text, setText] = useState("");
  return (
    <section className="search-box">
      <Input aria-label="Search" value={text} onChange={(e) => setText(e.target.value)} />
      <output>{`${text.length} letters`}</output>
    </section>
  );
}
