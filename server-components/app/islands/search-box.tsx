// Hydrates only when seen: what was typed, focused or scrolled before then
// is carried over (see the islands runtime).
import { signal } from "sluurp/reactive";
import { Input } from "sluurp/kit/input.js";

export default function SearchBox() {
  const text = signal("");
  return (
    <section class="search-box">
      <Input aria-label="Search" value={text} />
      <output>{`${text().length} letters`}</output>
      <div class="list" style={{ height: "60px", overflow: "auto" }}>
        {Array.from({ length: 20 }, (_, i) => <p>Row {i + 1}</p>)}
      </div>
    </section>
  );
}
