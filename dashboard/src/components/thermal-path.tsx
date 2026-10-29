import { InfoTip } from "@/components/info-tip"
import { data } from "@/lib/data"
import { fmt } from "@/lib/format"

/**
 * Where the temperature drop from junction to air happens. The package segment (Tj − Tcase,
 * what θJC measures and what TIM-1 controls) against the rest of the path (lid top, TIM-2,
 * heat sink, air). Makes "the thermal module dominates" visible for any design.
 */
export function ThermalPath({ tj, tcase }: { tj: number; tcase: number }) {
  const amb = data.t_amb_c
  const total = tj - amb
  const pkg = tj - tcase
  const rest = tcase - amb
  const pkgShare = (pkg / total) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        Temperature drop, junction to air
        <InfoTip label="About the temperature drop">
          Tj − Tcase is the package: die and TIM-1, what θJC measures. Tcase − air is the lid, TIM-2, heat sink and
          air. Most of Tj comes from the second part, so TIM-1 is judged by θJC, not by Tj.
        </InfoTip>
      </div>
      <div className="flex h-7 w-full overflow-hidden rounded-md text-[11px] font-medium" role="img"
        aria-label={`Package ${fmt(pkg, "Tj")} °C, lid to air ${fmt(rest, "Tj")} °C`}>
        <div
          className="flex items-center justify-center bg-primary text-primary-foreground transition-[width] duration-200 ease-out"
          style={{ width: `${Math.max(pkgShare, 4)}%` }}
        >
          {pkgShare > 12 && `${fmt(pkg, "Tj")} °C`}
        </div>
        <div className="flex flex-1 items-center justify-center border-l-2 border-card bg-muted text-muted-foreground">
          {fmt(rest, "Tj")} °C · lid, TIM-2, heat sink, air
        </div>
      </div>
      <div className="tabular flex justify-between text-xs text-muted-foreground">
        <span>
          Tj <span className="font-medium text-foreground">{fmt(tj, "Tj")} °C</span>
        </span>
        <span>
          Package {fmt(pkg, "Tj")} °C · {pkgShare.toFixed(0)} %
        </span>
        <span>
          Air <span className="font-medium text-foreground">{amb} °C</span>
        </span>
      </div>
    </div>
  )
}
