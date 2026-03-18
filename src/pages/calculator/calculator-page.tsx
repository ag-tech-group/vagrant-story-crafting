import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Plus,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import { MaterialSelect } from "@/components/material-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, type CraftingRecipe, type MaterialRecipe } from "@/lib/api"
import { cn } from "@/lib/utils"

const MATERIALS = [
  "Wood",
  "Leather",
  "Bronze",
  "Iron",
  "Hagane",
  "Silver",
  "Damascus",
]

// The API blade_type values don't match the material recipe type categories.
// This maps API blade_type → material recipe input type.
const MATERIAL_TYPE_MAP: Record<string, string> = {
  Axe: "AxeMace",
  "Great Axe": "Staff",
  "Heavy Mace": "Polearm",
  Mace: "Great Axe",
  Polearm: "Crossbow",
  Staff: "Heavy Mace",
}

function toMaterialType(apiType: string): string {
  return MATERIAL_TYPE_MAP[apiType] ?? apiType
}

function computeTier(delta1?: number, delta2?: number): number | undefined {
  if (delta1 == null && delta2 == null) return undefined
  if (delta1 == null) return delta2
  if (delta2 == null) return delta1
  return Math.min(delta1, delta2)
}

export function CalculatorPage() {
  const [itemA, setItemA] = useState<string | null>(null)
  const [itemB, setItemB] = useState<string | null>(null)
  const [materialA, setMaterialA] = useState<string | null>(null)
  const [materialB, setMaterialB] = useState<string | null>(null)
  const [targetItem, setTargetItem] = useState<string | null>(null)
  const [targetMaterial, setTargetMaterial] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [reverseCategoryFilter, setReverseCategoryFilter] =
    useState<string>("all")

  const { data: weapons = [] } = useQuery({
    queryKey: ["weapons"],
    queryFn: api.weapons,
  })
  const { data: armor = [] } = useQuery({
    queryKey: ["armor"],
    queryFn: api.armor,
  })
  const { data: recipes = [] } = useQuery({
    queryKey: ["crafting-recipes"],
    queryFn: () => api.craftingRecipes("limit=10000"),
  })
  const { data: materialRecipes = [] } = useQuery({
    queryKey: ["material-recipes"],
    queryFn: () => api.materialRecipes("limit=10000"),
  })

  const fmt = (s: string) => s.replace(/_/g, " ")

  // Build item list with levels (position within type, sorted by game_id)
  const { allItems, itemLevelMap } = useMemo(() => {
    const byType = new Map<
      string,
      { name: string; type: string; gameId: number }[]
    >()

    for (const w of weapons) {
      const type = w.blade_type
      if (!byType.has(type)) byType.set(type, [])
      byType
        .get(type)!
        .push({ name: fmt(w.field_name), type, gameId: w.game_id })
    }
    for (const a of armor) {
      const type = a.armor_type
      if (!byType.has(type)) byType.set(type, [])
      byType
        .get(type)!
        .push({ name: fmt(a.field_name), type, gameId: a.game_id })
    }

    const levelMap = new Map<string, number>()
    const items: PickerItem[] = []
    const seen = new Set<string>()

    for (const group of byType.values()) {
      group.sort((a, b) => a.gameId - b.gameId)
      group.forEach((item, i) => {
        levelMap.set(item.name, i + 1)
        if (!seen.has(item.name)) {
          seen.add(item.name)
          items.push({ name: item.name, type: item.type, level: i + 1 })
        }
      })
    }

    return { allItems: items, itemLevelMap: levelMap }
  }, [weapons, armor])

  type ItemStats = {
    str: number
    int: number
    agi: number
    range?: number
    damage?: number
    risk?: number
    gem_slots?: number
  }

  const itemStatsMap = useMemo(() => {
    const map = new Map<string, ItemStats>()
    for (const w of weapons) {
      map.set(fmt(w.field_name), {
        str: w.str,
        int: w.int,
        agi: w.agi,
        range: w.range,
        damage: w.damage,
        risk: w.risk,
      })
    }
    for (const a of armor) {
      map.set(fmt(a.field_name), {
        str: a.str,
        int: a.int,
        agi: a.agi,
        gem_slots: a.gem_slots,
      })
    }
    return map
  }, [weapons, armor])

  const itemTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of allItems) map.set(item.name, toMaterialType(item.type))
    // Case-insensitive fallback (e.g., "Hand Of Light" vs "Hand of Light")
    const lowerMap = new Map<string, string>()
    for (const item of allItems)
      lowerMap.set(item.name.toLowerCase(), toMaterialType(item.type))
    // Fill in recipe names that don't have an exact match
    for (const r of recipes) {
      for (const name of [r.input_1, r.input_2, r.result]) {
        if (map.has(name)) continue
        const lcType = lowerMap.get(name.toLowerCase())
        if (lcType) {
          map.set(name, lcType)
          continue
        }
        // Shield items aren't in weapons/armor API
        if (r.category === "shield") map.set(name, "Shield")
      }
    }
    return map
  }, [allItems, recipes])

  const CATEGORY_OPTIONS = [
    { value: "all", label: "All Equipment" },
    { value: "weapons", label: "Weapons" },
    { value: "armor", label: "Armor" },
    { value: "shields", label: "Shields" },
  ]

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return allItems
    const weaponTypes = new Set(weapons.map((w) => w.blade_type))
    const armorTypes = new Set(
      armor
        .filter(
          (a) => a.armor_type !== "Shield" && a.armor_type !== "Accessory"
        )
        .map((a) => a.armor_type)
    )
    return allItems.filter((item) => {
      if (categoryFilter === "weapons") return weaponTypes.has(item.type)
      if (categoryFilter === "armor") return armorTypes.has(item.type)
      if (categoryFilter === "shields")
        return item.type.toLowerCase() === "shield"
      return true
    })
  }, [allItems, categoryFilter, weapons, armor])

  // --- Forward calculator ---
  const results: CraftingRecipe[] = useMemo(() => {
    if (!itemA || !itemB) return []
    return recipes.filter(
      (r) =>
        (r.input_1 === itemA && r.input_2 === itemB) ||
        (r.input_1 === itemB && r.input_2 === itemA)
    )
  }, [itemA, itemB, recipes])

  const materialResult: (MaterialRecipe & { orderMatters: boolean }) | null =
    useMemo(() => {
      if (!materialA || !materialB || !itemA || !itemB) return null
      const typeA = itemTypeMap.get(itemA)
      const typeB = itemTypeMap.get(itemB)
      if (!typeA || !typeB) return null
      const match =
        materialRecipes.find(
          (r) =>
            r.input_1 === typeA &&
            r.input_2 === typeB &&
            r.material_1 === materialA &&
            r.material_2 === materialB
        ) ||
        materialRecipes.find(
          (r) =>
            r.input_1 === typeB &&
            r.input_2 === typeA &&
            r.material_1 === materialB &&
            r.material_2 === materialA
        )
      if (!match) return null

      // Check if swapping slot order gives a different result
      const swapped = materialRecipes.find(
        (r) =>
          r.input_1 === typeA &&
          r.input_2 === typeB &&
          r.material_1 === materialB &&
          r.material_2 === materialA
      )
      const orderMatters =
        swapped != null && swapped.result_material !== match.result_material

      return { ...match, orderMatters }
    }, [materialA, materialB, itemA, itemB, itemTypeMap, materialRecipes])

  // --- Reverse lookup ---
  const resultItems: PickerItem[] = useMemo(() => {
    const seen = new Set<string>()
    const items: PickerItem[] = []
    for (const r of recipes) {
      if (seen.has(r.result)) continue
      seen.add(r.result)
      const match = allItems.find((i) => i.name === r.result)
      items.push({
        name: r.result,
        type: match?.type ?? r.category,
        level: itemLevelMap.get(r.result),
      })
    }
    return items
  }, [recipes, allItems, itemLevelMap])

  const reverseFilteredItems = useMemo(() => {
    if (reverseCategoryFilter === "all") return resultItems
    const weaponTypes = new Set(weapons.map((w) => w.blade_type))
    const armorTypes = new Set(
      armor
        .filter(
          (a) => a.armor_type !== "Shield" && a.armor_type !== "Accessory"
        )
        .map((a) => a.armor_type)
    )
    return resultItems.filter((item) => {
      if (reverseCategoryFilter === "weapons") return weaponTypes.has(item.type)
      if (reverseCategoryFilter === "armor") return armorTypes.has(item.type)
      if (reverseCategoryFilter === "shields")
        return item.type.toLowerCase() === "shield"
      return true
    })
  }, [resultItems, reverseCategoryFilter, weapons, armor])

  const reverseRows = useMemo(() => {
    if (!targetItem) return []
    const matching = recipes.filter((r) => r.result === targetItem)

    return matching.map((r) => {
      const type1 = itemTypeMap.get(r.input_1)
      const type2 = itemTypeMap.get(r.input_2)

      const materialCombos: { mat1: string; mat2: string }[] = []
      if (targetMaterial && type1 && type2) {
        for (const mr of materialRecipes) {
          if (mr.result_material !== targetMaterial) continue
          if (mr.input_1 === type1 && mr.input_2 === type2) {
            materialCombos.push({ mat1: mr.material_1, mat2: mr.material_2 })
          } else if (mr.input_1 === type2 && mr.input_2 === type1) {
            materialCombos.push({ mat1: mr.material_2, mat2: mr.material_1 })
          }
        }
      }

      const resultType = itemTypeMap.get(r.result)
      const resultLevel = itemLevelMap.get(r.result)
      const level1 = itemLevelMap.get(r.input_1)
      const level2 = itemLevelMap.get(r.input_2)
      const delta1 =
        resultLevel != null && level1 != null && type1 === resultType
          ? resultLevel - level1
          : undefined
      const delta2 =
        resultLevel != null && level2 != null && type2 === resultType
          ? resultLevel - level2
          : undefined
      const tier = computeTier(delta1, delta2)

      return {
        id: r.id,
        input_1: r.input_1,
        input_2: r.input_2,
        category: r.category,
        tier: tier ?? 0,
        materialCombos,
        searchText: [
          r.input_1,
          type1 ?? "",
          level1 != null ? `Tier ${level1}` : "",
          r.input_2,
          type2 ?? "",
          level2 != null ? `Tier ${level2}` : "",
        ].join(" "),
      }
    })
  }, [
    targetItem,
    targetMaterial,
    recipes,
    itemTypeMap,
    itemLevelMap,
    materialRecipes,
  ])

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 lg:p-10">
      <div className="text-center">
        <h1 className="text-4xl tracking-wide sm:text-5xl lg:text-6xl">
          Crafting Calculator
        </h1>
        <p className="text-muted-foreground mt-3 text-base lg:text-lg">
          Select two items to see what they combine into
        </p>
      </div>

      {/* Forward calculator */}
      <div className="bg-card/50 border-border/50 space-y-6 rounded-xl border p-6">
        <div className="flex items-center justify-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => {
              setItemA(null)
              setItemB(null)
              setMaterialA(null)
              setMaterialB(null)
              setCategoryFilter("all")
            }}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>
        <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-stretch">
          <Card className="w-full flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Item 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemPicker
                items={filteredItems}
                value={itemA}
                onSelect={setItemA}
                placeholder="Choose first item..."
              />
              <MaterialSelect
                materials={MATERIALS}
                value={materialA}
                onSelect={setMaterialA}
              />
            </CardContent>
          </Card>

          <div className="flex shrink-0 items-center">
            <Plus className="text-muted-foreground size-10" />
          </div>

          <Card className="w-full flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Item 2</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemPicker
                items={filteredItems}
                value={itemB}
                onSelect={setItemB}
                placeholder="Choose second item..."
              />
              <MaterialSelect
                materials={MATERIALS}
                value={materialB}
                onSelect={setMaterialB}
              />
            </CardContent>
          </Card>

          <div className="flex shrink-0 items-center">
            <ArrowRight className="text-primary size-10" />
          </div>

          <Card className="border-primary/40 flex w-full flex-1 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((r) => {
                    const resultLevel = itemLevelMap.get(r.result)
                    const resultType = itemTypeMap.get(r.result)
                    const typeA = itemA ? itemTypeMap.get(itemA) : undefined
                    const typeB = itemB ? itemTypeMap.get(itemB) : undefined
                    const fwdLevel1 = itemA
                      ? itemLevelMap.get(itemA)
                      : undefined
                    const fwdLevel2 = itemB
                      ? itemLevelMap.get(itemB)
                      : undefined
                    const fwdDelta1 =
                      resultLevel != null &&
                      fwdLevel1 != null &&
                      typeA === resultType
                        ? resultLevel - fwdLevel1
                        : undefined
                    const fwdDelta2 =
                      resultLevel != null &&
                      fwdLevel2 != null &&
                      typeB === resultType
                        ? resultLevel - fwdLevel2
                        : undefined
                    const tier = computeTier(fwdDelta1, fwdDelta2) ?? 0

                    return (
                      <div key={r.id} className="space-y-4">
                        {/* Item name — aligned with ItemPicker */}
                        <div className="flex h-12 items-center gap-2 rounded-md border px-3">
                          <div className="bg-muted size-8 shrink-0 rounded" />
                          <span className="flex-1 text-sm font-medium">
                            {r.result}
                          </span>
                          {resultLevel != null && (
                            <span className="text-muted-foreground text-xs">
                              Tier {resultLevel}
                            </span>
                          )}
                          {tier != null && <TierValue value={tier} />}
                        </div>
                        {/* Material — always rendered to maintain height */}
                        <div className="flex h-10 items-center gap-1.5 rounded-md border px-3">
                          {materialResult ? (
                            <>
                              <MaterialBadge
                                mat={materialResult.result_material}
                              />
                              {materialResult.orderMatters && (
                                <span
                                  className="text-xs text-amber-400"
                                  title="Swapping slot order gives a different result"
                                >
                                  *
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Select materials...
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {materialResult?.orderMatters && (
                    <p className="text-muted-foreground text-xs">
                      * Slot order affects the result material
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex h-12 items-center justify-center rounded-md border px-3">
                    <span className="text-muted-foreground text-sm">
                      {itemA && itemB ? "No recipe found" : "Select two items"}
                    </span>
                  </div>
                  <div className="flex h-10 items-center rounded-md border px-3">
                    <span className="text-muted-foreground text-xs">
                      Select materials...
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reverse lookup */}
      <div className="w-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl tracking-wide sm:text-3xl">Reverse Lookup</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick a result to see every combination that creates it
          </p>
        </div>

        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-44 shrink-0">
            <Select
              value={reverseCategoryFilter}
              onValueChange={setReverseCategoryFilter}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <ItemPicker
              items={reverseFilteredItems}
              value={targetItem}
              onSelect={setTargetItem}
              placeholder="Search for a result item..."
            />
          </div>
          <div className="sm:w-48">
            <MaterialSelect
              materials={MATERIALS}
              value={targetMaterial}
              onSelect={setTargetMaterial}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setTargetItem(null)
              setTargetMaterial(null)
              setReverseCategoryFilter("all")
            }}
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>

        {targetItem && (
          <ReverseTable
            rows={reverseRows}
            targetMaterial={targetMaterial}
            targetItem={targetItem}
            itemTypeMap={itemTypeMap}
            itemLevelMap={itemLevelMap}
            itemStatsMap={itemStatsMap}
          />
        )}
      </div>
    </div>
  )
}

// --- Reverse lookup table with TanStack Table ---

type ReverseRow = {
  id: number
  input_1: string
  input_2: string
  category: string
  tier: number
  materialCombos: { mat1: string; mat2: string }[]
  searchText: string
}

function ReverseTable({
  rows,
  targetMaterial,
  targetItem,
  itemTypeMap,
  itemLevelMap,
  itemStatsMap,
}: {
  rows: ReverseRow[]
  targetMaterial: string | null
  targetItem: string | null
  itemTypeMap: Map<string, string>
  itemLevelMap: Map<string, number>
  itemStatsMap: Map<
    string,
    {
      str: number
      int: number
      agi: number
      range?: number
      damage?: number
      risk?: number
      gem_slots?: number
    }
  >
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<ReverseRow>[]>(
    () => [
      {
        accessorKey: "input_1",
        header: "Slot 1",
        cell: ({ row }) => (
          <SlotCell
            name={row.original.input_1}
            type={itemTypeMap.get(row.original.input_1)}
            level={itemLevelMap.get(row.original.input_1)}
            stats={itemStatsMap.get(row.original.input_1)}
            materials={
              targetMaterial
                ? [
                    ...new Set(row.original.materialCombos.map((c) => c.mat1)),
                  ].sort((a, b) => MATERIALS.indexOf(a) - MATERIALS.indexOf(b))
                : undefined
            }
          />
        ),
      },
      {
        accessorKey: "input_2",
        header: "Slot 2",
        cell: ({ row }) => (
          <SlotCell
            name={row.original.input_2}
            type={itemTypeMap.get(row.original.input_2)}
            level={itemLevelMap.get(row.original.input_2)}
            stats={itemStatsMap.get(row.original.input_2)}
            materials={
              targetMaterial
                ? [
                    ...new Set(row.original.materialCombos.map((c) => c.mat2)),
                  ].sort((a, b) => MATERIALS.indexOf(a) - MATERIALS.indexOf(b))
                : undefined
            }
          />
        ),
      },
      {
        accessorKey: "tier",
        header: "Tier Change",
        cell: ({ getValue }) => <TierValue value={getValue<number>()} />,
      },
    ],
    [targetMaterial, itemTypeMap, itemLevelMap, itemStatsMap]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      return row.original.searchText
        .toLowerCase()
        .includes(filterValue.toLowerCase())
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {rows.length} recipe{rows.length !== 1 && "s"} found
          {targetMaterial && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · showing material paths for {targetMaterial}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      {targetItem && (
        <div className="bg-card border-border/50 sticky top-14 z-10 border-b px-6 py-2">
          <SlotCell
            name={targetItem}
            type={itemTypeMap.get(targetItem)}
            level={itemLevelMap.get(targetItem)}
            stats={itemStatsMap.get(targetItem)}
          />
        </div>
      )}
      <CardContent className="space-y-3 overflow-x-auto">
        {rows.length > 0 && (
          <Input
            placeholder="Filter results..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        )}
        {rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-border border-b">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "text-muted-foreground px-3 py-2 text-left font-medium",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none",
                        header.id === "tier_change" && "text-right"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-border/50 border-b last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2",
                        cell.column.id === "tier_change" && "text-right"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground py-4 text-center">
            No recipes produce this item
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const MAT_BADGE_COLORS: Record<string, string> = {
  Wood: "bg-amber-900/60 text-amber-200 border-amber-700/50",
  Leather: "bg-amber-700/60 text-amber-100 border-amber-600/50",
  Bronze: "bg-orange-600/60 text-orange-100 border-orange-500/50",
  Iron: "bg-slate-500/60 text-slate-100 border-slate-400/50",
  Hagane: "bg-blue-600/60 text-blue-100 border-blue-500/50",
  Silver: "bg-gray-300/70 text-gray-900 border-gray-400/50",
  Damascus: "bg-purple-600/60 text-purple-100 border-purple-500/50",
}

function SlotCell({
  name,
  type,
  level,
  stats,
  materials,
}: {
  name: string
  type?: string
  level?: number
  stats?: {
    str: number
    int: number
    agi: number
    range?: number
    damage?: number
    risk?: number
    gem_slots?: number
  }
  materials?: string[]
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{name}</span>
        {type && <span className="text-muted-foreground text-xs">{type}</span>}
        {level != null && (
          <span className="text-muted-foreground text-xs">Tier {level}</span>
        )}
      </div>
      {stats && (
        <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0 text-[11px]">
          <span>STR {stats.str}</span>
          <span>INT {stats.int}</span>
          <span>AGI {stats.agi}</span>
          {stats.range != null && <span>RNG {stats.range}</span>}
          {stats.damage != null && <span>DMG {stats.damage}</span>}
          {stats.risk != null && <span>RSK {stats.risk}</span>}
          {stats.gem_slots != null && <span>Gems {stats.gem_slots}</span>}
        </div>
      )}
      {materials && materials.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {materials.map((m) => (
            <MaterialBadge key={m} mat={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function TierValue({ value }: { value: number }) {
  if (value === 0) return <span className="text-muted-foreground">0</span>
  return (
    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
      {value > 0 ? `+${value}` : value}
    </span>
  )
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3.5" />
  if (sorted === "desc") return <ArrowDown className="size-3.5" />
  return <ArrowUpDown className="text-muted-foreground/50 size-3.5" />
}

function MaterialBadge({ mat }: { mat: string }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[11px] leading-tight font-medium",
        MAT_BADGE_COLORS[mat] ?? "bg-muted"
      )}
    >
      {mat}
    </span>
  )
}
