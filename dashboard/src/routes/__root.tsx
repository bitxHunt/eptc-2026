import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router"

import { AppSidebar, NAV } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  const { pathname } = useLocation()
  const current = NAV.flatMap((s) => s.items.map((i) => ({ ...i, group: s.group }))).find((i) => i.to === pathname)

  return (
    <TooltipProvider delay={300}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur-sm md:px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              {current && <span className="hidden text-muted-foreground sm:inline">{current.group}</span>}
              {current && <span className="hidden text-muted-foreground/60 sm:inline">/</span>}
              <span className="truncate font-medium">{current?.title ?? "Overview"}</span>
            </nav>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
