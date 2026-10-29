import { Link, useLocation } from "@tanstack/react-router"
import {
  ActivityIcon,
  BookOpenIcon,
  FlaskConicalIcon,
  GaugeIcon,
  LayersIcon,
  ScatterChartIcon,
  SlidersHorizontalIcon,
  TableIcon,
} from "lucide-react"

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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            FB
          </div>
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
              <SidebarMenu>
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
      <SidebarFooter className="px-3 pb-3 group-data-[collapsible=icon]:hidden">
        <div className="tabular flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-series-3" aria-hidden />
          {data.n_solved}/{data.n_total} Ansys runs solved
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
