import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface PickerItem {
  name: string
  type: string
  level?: number
}

interface ItemPickerProps {
  items: PickerItem[]
  value: string | null
  onSelect: (name: string | null) => void
  placeholder?: string
  label?: string
  formatType?: (type: string) => string
}

export function ItemPicker({
  items,
  value,
  onSelect,
  placeholder = "Select item...",
  label,
  formatType,
}: ItemPickerProps) {
  const [open, setOpen] = useState(false)
  const selectedItem = value ? items.find((i) => i.name === value) : null

  // Group items by type, sorted by level within each group
  const groups = items.reduce<Record<string, PickerItem[]>>((acc, item) => {
    const group = item.type || "Other"
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})
  for (const items of Object.values(groups)) {
    items.sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-muted-foreground text-xs font-medium">
          {label}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-12 w-full justify-between px-3 py-2"
          >
            {value ? (
              <div className="flex flex-1 items-center gap-2">
                <div className="bg-muted size-8 shrink-0 rounded" />
                <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
                  {value}
                </span>
                {selectedItem?.type && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatType
                      ? formatType(selectedItem.type)
                      : selectedItem.type}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">
                {placeholder}
              </span>
            )}
            <div className="flex items-center gap-1">
              {value && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(null)
                    setOpen(false)
                  }}
                >
                  <X className="size-4" />
                </button>
              )}
              <ChevronsUpDown className="text-muted-foreground size-4" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search items..." />
            <CommandList>
              <CommandEmpty>No items found.</CommandEmpty>
              {Object.entries(groups).map(([type, groupItems]) => (
                <CommandGroup key={type} heading={type}>
                  {groupItems.map((item) => (
                    <CommandItem
                      key={item.name}
                      value={item.name}
                      onSelect={() => {
                        onSelect(item.name === value ? null : item.name)
                        setOpen(false)
                      }}
                    >
                      <div className="bg-muted size-6 rounded" />
                      <span className="flex-1">{item.name}</span>
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          value === item.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
