import { cn } from "@/lib/utils"

/** Page heading row: title, one line of context, optional controls on the right. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="max-w-[70ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Page({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6", className)} {...props} />
}

/** A titled panel. Flat surface, hairline border; no nested cards. */
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 md:p-5", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="flex items-center gap-1.5 text-sm font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
