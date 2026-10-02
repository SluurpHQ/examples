import { cn } from "sluurp/cn";
import { Button, type ButtonProps } from "sluurp/kit/button.js";

/** The kit's Button, painted with a gradient. */
export interface GradientButtonProps extends ButtonProps {
  /** Where the gradient starts and ends. */
  tone?: "sunset" | "ocean" | "forest";
}

const TONES = {
  sunset: "from-amber-400 to-rose-500",
  ocean: "from-sky-400 to-indigo-600",
  forest: "from-lime-400 to-emerald-600",
};

/** A button for the one thing a page is for, when the page is a celebration. */
export function GradientButton({ tone = "sunset", className, ...rest }: GradientButtonProps = {}) {
  return <Button {...rest} className={cn("bg-linear-to-r text-white shadow-md hover:opacity-90", TONES[tone], className)} />;
}
