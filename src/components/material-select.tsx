import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const MATERIAL_COLORS: Record<string, string> = {
  Wood: "bg-amber-800",
  Leather: "bg-amber-600",
  Bronze: "bg-orange-500",
  Iron: "bg-slate-400",
  Hagane: "bg-blue-400",
  Silver: "bg-gray-300",
  Damascus: "bg-purple-400",
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
      <Select value={value ?? ""} onValueChange={(v) => onSelect(v || null)}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="Select material..." />
        </SelectTrigger>
        <SelectContent>
          {materials.map((mat) => (
            <SelectItem key={mat} value={mat}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-3 rounded-full",
                    MATERIAL_COLORS[mat] || "bg-muted"
                  )}
                />
                {mat}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
