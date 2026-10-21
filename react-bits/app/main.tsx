import { Component, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { ColorPicker } from "@/components/sluurp/color-picker"
import { Slider } from "@/components/ui/slider"
import MicroSlats from "./components/MicroSlats"
import { Counter } from "./components/Counter"

/** Without WebGL (turned off, or refused: a browser gives a page only so many) the slats cannot draw: a note in their place, the error in the console, the rest of the page kept. */
class NoWebGL extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error("The slats could not be drawn:", error)
  }
  render() {
    return this.state.failed ? (
      <p className="grid h-full place-items-center p-6 text-center text-sm text-white/70">The slats need WebGL, and this browser did not give it: it may be turned off, or too many pages are using the graphics card.</p>
    ) : (
      this.props.children
    )
  }
}

function App() {
  const [color, setColor] = useState("#A855F7")
  const [gap, setGap] = useState(3)
  return (
    <main className="relative h-svh bg-black">
      <NoWebGL>
        <MicroSlats color={color} gap={gap} />
      </NoWebGL>
      <div className="absolute bottom-4 left-4 grid w-64 gap-3 rounded-lg bg-background/90 p-3">
        <ColorPicker value={color} onValueChange={setColor} aria-label="Colour" />
        <Slider min={0} max={12} step={1} value={[gap]} onValueChange={(v) => setGap(Array.isArray(v) ? v[0]! : v)} aria-label="Gap" />
        <Counter label="Clicked"><b>times</b></Counter>
      </div>
    </main>
  )
}

createRoot(document.getElementById("app")!).render(<App />)
