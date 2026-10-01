/**
 * The ninth batch: the shell and the numbers.
 *
 * The sidebar is layout you live in; the chart is the one component where
 * getting the colours wrong is not a matter of taste.
 */

import { computed } from "sluurp/reactive";
import { html, mount } from "sluurp/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "sluurp/kit/card.js";
import { Chart } from "sluurp/kit/chart.js";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge, SidebarSeparator } from "sluurp/kit/sidebar.js";

const nav = Sidebar({ collapsible: "icon" });

const TRAFFIC = [
  { month: "Jan", desktop: 186, mobile: 80, tablet: 40 },
  { month: "Feb", desktop: 305, mobile: 200, tablet: 62 },
  { month: "Mar", desktop: 237, mobile: 120, tablet: 51 },
  { month: "Apr", desktop: 273, mobile: 190, tablet: 84 },
  { month: "May", desktop: 209, mobile: 130, tablet: 73 },
  { month: "Jun", desktop: 314, mobile: 240, tablet: 98 },
];

const SERIES = {
  desktop: { label: "Desktop" },
  mobile: { label: "Mobile" },
  tablet: { label: "Tablet" },
};

const item = (label, icon, badge, active) =>
  SidebarMenuItem({
    children: html`${SidebarMenuButton({
      href: "#",
      isActive: active,
      tooltip: label,
      children: html`${icon}<span>${label}</span>`,
    })}
    ${badge ? SidebarMenuBadge({ children: badge }) : ""}`,
  });

/**
 * One icon each, drawn rather than named.
 *
 * A sidebar collapsed to icons is only usable when the icons distinguish the
 * rows — the same square repeated is a column of identical buttons, which is
 * the collapsed state failing at the only thing it is for. These are the
 * 24-unit, 2px-stroke, round-capped shapes the rest of the kit uses, so they
 * sit on the same grid as the chevrons and checks.
 */
const icon = (paths) =>
  html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"
    >${paths}</svg>`;

const icons = {
  logo: icon(html`<path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />`),
  dashboard: icon(html`<rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />`),
  collections: icon(html`<ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />`),
  files: icon(html`<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />`),
  realtime: icon(html`<path d="M2 12h3l2-7 4 14 3-9 2 2h6" />`),
  members: icon(html`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />`),
  billing: icon(html`<rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" />`),
  logs: icon(html`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" />`),
  account: icon(html`<circle cx="12" cy="8" r="4" />
    <path d="M6 21v-1a6 6 0 0 1 12 0v1" />`),
};

const panel = (title, note, body) =>
  Card({
    children: html`${CardHeader({
      children: html`${CardTitle({ children: title })}
      ${CardDescription({ children: note })}`,
    })}
    ${CardContent({ children: body })}`,
  });

mount("#app", () =>
  nav.provider(html`
    ${nav.view(html`
      ${SidebarHeader({
        children: SidebarMenu({
          children: SidebarMenuItem({
            children: SidebarMenuButton({
              size: "lg",
              children: html`${icons.logo}<span class="font-semibold">Sluurp</span>`,
            }),
          }),
        }),
      })}
      ${SidebarSeparator()}
      ${SidebarContent({
        children: html`${SidebarGroup({
          label: "Platform",
          children: SidebarMenu({
            children: html`${item("Dashboard", icons.dashboard, null, true)}
            ${item("Collections", icons.collections, "12")}
            ${item("Files", icons.files, "3")}
            ${item("Realtime", icons.realtime)}`,
          }),
        })}
        ${SidebarGroup({
          label: "Settings",
          children: SidebarMenu({
            children: html`${item("Members", icons.members)}
            ${item("Billing", icons.billing)}
            ${item("Logs", icons.logs)}`,
          }),
        })}`,
      })}
      ${SidebarFooter({
        children: SidebarMenu({
          children: SidebarMenuItem({
            children: SidebarMenuButton({
              tooltip: "Account",
              children: html`${icons.account}<span>Account</span>`,
            }),
          }),
        }),
      })}
      ${nav.rail()}
    `)}

    ${nav.inset(
      html`<header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        ${nav.trigger()}
        <span class="text-sm font-medium">Dashboard</span>
        <span class="ml-auto text-xs text-muted-foreground"
          >Sidebar is
          <span class="font-medium text-foreground">${computed(() => nav.state())}</span> —
          Ctrl-B or the icon</span
        >
      </header>

      <div class="grid gap-6 p-6 lg:grid-cols-2">
        ${panel(
          "Visitors",
          "Stacked bars, 2px apart so two segments read as two.",
          Chart({ type: "bar", data: TRAFFIC, x: "month", config: SERIES, stacked: true }),
        )}
        ${panel(
          "Trend",
          "Two-pixel lines, markers only where the pointer is, and a crosshair.",
          Chart({ type: "line", data: TRAFFIC, x: "month", config: SERIES }),
        )}
        ${panel(
          "Overlaid areas",
          "The same numbers as overlapping areas — not a share, which is why it is not called one. Hover any column: the hit target is the whole band, not the 2px line.",
          Chart({ type: "area", data: TRAFFIC, x: "month", config: SERIES }),
        )}
        ${panel(
          "One series",
          "No legend: with one series the title already names it.",
          Chart({
            type: "bar",
            data: TRAFFIC,
            x: "month",
            config: { desktop: { label: "Desktop" } },
          }),
        )}
      </div>`,
    )}
  `),
);
