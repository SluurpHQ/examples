import { StatCard } from "./stat-card.tsx";

export default {
  title: "Stat Card",
  component: StatCard,
  parameters: {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m7 15 3-3 3 2 4-5"/></svg>',
    docs: { description: { component: "One number that matters, with how it moved since last time." } } },
  args: { label: "Sign-ups this week", value: 128, change: 12 },
  render: (args: any) => <StatCard className="w-64" label={args.label} value={args.value} change={args.change} />,
};

export const Up = {};
export const Down = { args: { label: "Absences", value: 17, change: -8 } };
