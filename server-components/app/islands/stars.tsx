import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";

export default function Stars(props: { start: number }) {
  const [stars, setStars] = createSignal(props.start);
  return (
    <p className="stars">
      <b>{stars()}</b> stars <Button variant="outline" onClick={() => setStars(stars() + 1)}>Star</Button>
    </p>
  );
}
