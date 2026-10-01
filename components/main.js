import { signal } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { cn, variants } from "sluurp/cn";

const button = variants(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: { default: "h-9 px-4 py-2", sm: "h-8 rounded-md px-3 text-xs", lg: "h-10 rounded-md px-8" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

// The test that matters: a caller's class must beat the base one.
window.__probe = {
  merged: cn("px-2 py-1", "px-4"),
  variantOverride: button({ className: "px-8" }),
  unknown: cn("px-2", "my-own-class", "px-4"),
  scoped: cn("hover:px-2", "px-4"),
};

mount("#app", () => html`
  <h1 class="text-2xl font-semibold tracking-tight">Buttons</h1>
  <div class="flex gap-2 items-center">
    <button class="${button({})}">Default</button>
    <button class="${button({ variant: "destructive" })}">Destructive</button>
    <button class="${button({ variant: "outline" })}">Outline</button>
    <button class="${button({ variant: "ghost" })}">Ghost</button>
  </div>
  <div class="flex gap-2 items-center">
    <button class="${button({ size: "sm" })}">Small</button>
    <button class="${button({ size: "lg" })}">Large</button>
    <button class="${button({})}" disabled>Disabled</button>
  </div>
`);
