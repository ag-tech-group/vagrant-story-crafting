import { X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const MATERIAL_BADGE_COLORS: Record<string, string> = {
  Wood: "bg-amber-900/60 text-amber-200 border-amber-700/50",
  Leather: "bg-amber-700/60 text-amber-100 border-amber-600/50",
  Bronze: "bg-orange-600/60 text-orange-100 border-orange-500/50",
  Iron: "bg-slate-500/60 text-slate-100 border-slate-400/50",
  Hagane: "bg-blue-600/60 text-blue-100 border-blue-500/50",
  Silver: "bg-gray-300/70 text-gray-900 border-gray-400/50",
  Damascus: "bg-purple-600/60 text-purple-100 border-purple-500/50",
}

interface MaterialSelectProps {
  materials: string[]
  value: string | null
  onSelect: (material: string | null) => void
  label?: string
}

export function MaterialSelect({
  materials,
  value,
  onSelect,
  label,
}: MaterialSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
      )}
      <div className="relative">
        <Select value={value ?? ""} onValueChange={(v) => onSelect(v || null)}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Select material..." />
          </SelectTrigger>
          <SelectContent>
            {materials.map((mat) => (
              <SelectItem key={mat} value={mat}>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-xs font-medium",
                    MATERIAL_BADGE_COLORS[mat] ?? "bg-muted"
                  )}
                >
                  {mat}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-8 -translate-y-1/2"
            onClick={() => onSelect(null)}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
