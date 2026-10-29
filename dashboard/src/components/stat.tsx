import { InfoTip } from "@/components/info-tip"
import { cn } from "@/lib/utils"

/** One labelled number. Value leads; unit and context stay quiet. */
export function Stat({
  label,
  value,
  unit,
  hint,
  sub,
  className,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  sub?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {hint && <InfoTip label={`About ${label}`}>{hint}</InfoTip>}
      </div>
      <div className="tabular flex items-baseline gap-1 text-2xl font-semibold tracking-tight">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="tabular truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
