import { BrandButton } from "./brand-button.tsx";

export default {
  title: "Actions/BrandButton",
  component: BrandButton,
  parameters: { docs: { description: { component: "What is done here. One primary per view; destructive for what cannot be undone; ghost in toolbars." } } },
  args: { children: "Save changes", disabled: false },
  argTypes: {
    variant: { control: "select", options: ["default", "secondary", "outline", "ghost", "destructive", "link"] },
    size: { control: "select", options: ["default", "xs", "sm", "lg"] },
  },
};

export const Primary = {};
export const Secondary = { args: { variant: "secondary" } };
export const Outline = { args: { variant: "outline" } };
export const Destructive = { args: { variant: "destructive", children: "Delete" } };
export const Small = { args: { size: "sm" } };
export const Disabled = { args: { disabled: true } };
