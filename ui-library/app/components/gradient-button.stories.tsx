import { GradientButton } from "./gradient-button.tsx";

export default {
  title: "Buttons/Gradient Button",
  component: GradientButton,
  parameters: {
    // Its mark in the UI kit's list: any SVG.
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="10" x="3" y="7" rx="5"/><path d="M8 12h8"/><path d="M19 3v2M20 4h-2"/></svg>',
    docs: { description: { component: "The kit's Button with a gradient, for the one thing a page is for." } } },
  args: { children: "Book the trip" },
  argTypes: { tone: { control: "select", options: ["sunset", "ocean", "forest"] } },
};

export const Sunset = {};
export const Ocean = { args: { tone: "ocean" } };
export const Large = { args: { tone: "forest", size: "lg" } };
