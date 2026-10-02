import { signal } from "sluurp/reactive";
import { mount } from "sluurp/ui";
import { ColorPicker } from "sluurp/kit/color-picker.js";
import { Slider } from "sluurp/kit/slider.js";
import MicroSlats from "./components/MicroSlats.tsx";
import { Counter } from "./components/Counter.tsx";

const color = signal("#A855F7");
const gap = signal(3);

mount("#app", () => (
  <main class="relative h-svh bg-black">
    <MicroSlats color={color()} gap={gap()} />
    <div class="absolute bottom-4 left-4 grid w-64 gap-3 rounded-lg bg-background/90 p-3">
      <ColorPicker value={color} aria-label="Colour" />
      <Slider min={0} max={12} step={1} value={gap} ariaLabel="Gap" />
      <Counter label="Clicked"><b>times</b></Counter>
    </div>
  </main>
));
