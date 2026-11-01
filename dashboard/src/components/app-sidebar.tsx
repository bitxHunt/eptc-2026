import { Link, useLocation } from "@tanstack/react-router"
import {
  ActivityIcon,
  BookOpenIcon,
  FlaskConicalIcon,
  FolderGit2Icon,
  GaugeIcon,
  LayersIcon,
  ScatterChartIcon,
  SlidersHorizontalIcon,
  TableIcon,
} from "lucide-react"

import { ChipLogo } from "@/components/chip-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { data } from "@/lib/data"

export const NAV = [
  {
    group: "Results",
    items: [
      { to: "/", title: "Overview", icon: GaugeIcon },
      { to: "/trade-off", title: "Trade-off", icon: ScatterChartIcon },
      { to: "/materials", title: "Materials", icon: LayersIcon },
      { to: "/drivers", title: "Key drivers", icon: ActivityIcon },
    ],
  },
  {
    group: "Surrogate",
    items: [
      { to: "/explorer", title: "Design explorer", icon: SlidersHorizontalIcon },
      { to: "/accuracy", title: "Accuracy", icon: FlaskConicalIcon },
    ],
  },
  {
    group: "Data",
    items: [
      { to: "/runs", title: "All runs", icon: TableIcon },
      { to: "/method", title: "Method and limits", icon: BookOpenIcon },
    ],
  },
] as const

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <ChipLogo />

          <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">TIM Explorer</span>
            <span className="truncate text-xs text-muted-foreground">Finite Boys · EPTC 2026</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {NAV.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={pathname === item.to}
                      render={<Link to={item.to} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1.5 px-3 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="tabular flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-series-3" aria-hidden />
          {data.n_solved}/{data.n_total} Ansys runs solved
        </div>
        <a
          href="https://github.com/bitxHunt/eptc-2026"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <FolderGit2Icon className="size-3.5" aria-hidden />
          Source on GitHub
        </a>
      </SidebarFooter>
    </Sidebar>
  )
}
