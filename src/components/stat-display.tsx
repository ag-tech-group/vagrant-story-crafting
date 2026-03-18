import type { EffectiveStats, ItemStats } from "@/lib/item-stats"
import { cn } from "@/lib/utils"

const DMG_TYPE_COLORS: Record<string, string> = {
  Edged: "bg-slate-500/60 text-slate-100 border-slate-400/50",
  Blunt: "bg-amber-700/60 text-amber-100 border-amber-600/50",
  Piercing: "bg-sky-600/60 text-sky-100 border-sky-500/50",
}

interface StatDisplayProps {
  stats: ItemStats | EffectiveStats
  compareWith?: ItemStats | EffectiveStats
  showAffinities?: boolean
  compact?: boolean
}

export function StatDisplay({
  stats,
  compareWith,
  showAffinities = false,
  compact = false,
}: StatDisplayProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Damage type badge */}
      {stats.damage_type && (
        <div>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[11px] leading-tight font-medium",
              DMG_TYPE_COLORS[stats.damage_type] ?? "bg-muted"
            )}
          >
            {stats.damage_type}
          </span>
        </div>
      )}

      {/* Core stats */}
      <div className="flex flex-wrap gap-1.5">
        <Stat
          label="STR"
          value={stats.str}
          compare={compareWith?.str}
          compact={compact}
        />
        <Stat
          label="INT"
          value={stats.int}
          compare={compareWith?.int}
          compact={compact}
        />
        <Stat
          label="AGI"
          value={stats.agi}
          compare={compareWith?.agi}
          compact={compact}
        />
        {stats.range != null && (
          <Stat
            label="RNG"
            value={stats.range}
            compare={compareWith?.range}
            compact={compact}
          />
        )}
        {stats.damage != null && (
          <Stat
            label="DMG"
            value={stats.damage}
            compare={compareWith?.damage}
            compact={compact}
          />
        )}
        {stats.risk != null && (
          <Stat
            label="RSK"
            value={stats.risk}
            compare={compareWith?.risk}
            compact={compact}
          />
        )}
        {stats.gem_slots != null && (
          <Stat
            label="Gems"
            value={stats.gem_slots}
            compare={compareWith?.gem_slots}
            compact={compact}
          />
        )}
      </div>

      {/* Affinities */}
      {showAffinities && "human" in stats && (
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Hum" value={stats.human ?? 0} compact />
            <Stat label="Bst" value={stats.beast ?? 0} compact />
            <Stat label="Und" value={stats.undead ?? 0} compact />
            <Stat label="Phm" value={stats.phantom ?? 0} compact />
            <Stat label="Drg" value={stats.dragon ?? 0} compact />
            <Stat label="Evl" value={stats.evil ?? 0} compact />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Stat label="Fir" value={stats.fire ?? 0} compact />
            <Stat label="Wat" value={stats.water ?? 0} compact />
            <Stat label="Wnd" value={stats.wind ?? 0} compact />
            <Stat label="Ear" value={stats.earth ?? 0} compact />
            <Stat label="Lit" value={stats.light ?? 0} compact />
            <Stat label="Drk" value={stats.dark ?? 0} compact />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  compare,
  compact = false,
}: {
  label: string
  value: number
  compare?: number
  compact?: boolean
}) {
  const diff = compare != null ? compare - value : undefined
  const size = compact ? "min-w-9 px-1.5 py-1" : "min-w-11 px-2 py-1.5"

  return (
    <div className={cn("bg-muted/50 flex flex-col items-center rounded", size)}>
      <span
        className={cn(
          "text-muted-foreground leading-none",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "leading-tight font-medium",
          compact ? "text-xs" : "text-sm",
          value > 0 && "text-green-400",
          value < 0 && "text-red-400",
          value === 0 && "text-muted-foreground"
        )}
      >
        {value}
      </span>
      {diff != null && diff !== 0 && (
        <span
          className={cn(
            "leading-none font-medium",
            compact ? "text-[10px]" : "text-xs",
            diff > 0 ? "text-green-400" : "text-red-400"
          )}
        >
          ({diff > 0 ? `+${diff}` : diff})
        </span>
      )}
    </div>
  )
}
