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
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ItemPicker, type PickerItem } from "@/components/item-picker"
import { MaterialSelect } from "@/components/material-select"
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

export function CalculatorPage() {
  const [itemA, setItemA] = useState<string | null>(null)
  const [itemB, setItemB] = useState<string | null>(null)
  const [materialA, setMaterialA] = useState<string | null>(null)
  const [materialB, setMaterialB] = useState<string | null>(null)
  const [targetItem, setTargetItem] = useState<string | null>(null)
  const [targetMaterial, setTargetMaterial] = useState<string | null>(null)

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

  const allItems: PickerItem[] = useMemo(() => {
    const weaponItems = weapons.map((w) => ({
      name: fmt(w.field_name),
      type: w.blade_type,
    }))
    const armorItems = armor.map((a) => ({
      name: fmt(a.field_name),
      type: a.armor_type,
    }))
    const seen = new Set<string>()
    return [...weaponItems, ...armorItems].filter((item) => {
      if (seen.has(item.name)) return false
      seen.add(item.name)
      return true
    })
  }, [weapons, armor])

  // Item name → level (1-indexed position within type, sorted by game_id)
  const itemLevelMap = useMemo(() => {
    const map = new Map<string, number>()
    const byType = new Map<string, { name: string; gameId: number }[]>()

    for (const w of weapons) {
      const type = w.blade_type
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type)!.push({ name: fmt(w.field_name), gameId: w.game_id })
    }
    for (const a of armor) {
      const type = a.armor_type
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type)!.push({ name: fmt(a.field_name), gameId: a.game_id })
    }

    for (const items of byType.values()) {
      items.sort((a, b) => a.gameId - b.gameId)
      items.forEach((item, i) => map.set(item.name, i + 1))
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
      items.push({ name: r.result, type: match?.type ?? r.category })
    }
    return items
  }, [recipes, allItems])

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

      const resultLevel = itemLevelMap.get(r.result)
      const level1 = itemLevelMap.get(r.input_1)
      const level2 = itemLevelMap.get(r.input_2)
      const delta1 =
        resultLevel != null && level1 != null ? resultLevel - level1 : undefined
      const delta2 =
        resultLevel != null && level2 != null ? resultLevel - level2 : undefined
      let tier: number | undefined
      if (delta1 != null && delta2 != null) {
        tier = Math.abs(delta1) >= Math.abs(delta2) ? delta1 : delta2
      } else {
        tier = delta1 ?? delta2
      }

      return {
        id: r.id,
        input_1: r.input_1,
        input_2: r.input_2,
        category: r.category,
        tier: tier ?? r.tier_change,
        materialCombos,
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
      <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <Card className="w-full flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Item 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ItemPicker
              items={allItems}
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
              items={allItems}
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
          <CardContent className="flex flex-1 flex-col justify-center">
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((r) => {
                  const resultLevel = itemLevelMap.get(r.result)
                  const level1 = itemA ? itemLevelMap.get(itemA) : undefined
                  const level2 = itemB ? itemLevelMap.get(itemB) : undefined
                  const delta1 =
                    resultLevel != null && level1 != null
                      ? resultLevel - level1
                      : undefined
                  const delta2 =
                    resultLevel != null && level2 != null
                      ? resultLevel - level2
                      : undefined

                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="bg-muted size-10 shrink-0 rounded" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{r.result}</p>
                        {materialResult && (
                          <div className="mt-1 flex items-center gap-1.5">
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
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm">
                        {delta1 != null && delta2 != null ? (
                          <TierValue
                            value={
                              Math.abs(delta1) >= Math.abs(delta2)
                                ? delta1
                                : delta2
                            }
                          />
                        ) : delta1 != null ? (
                          <TierValue value={delta1} />
                        ) : delta2 != null ? (
                          <TierValue value={delta2} />
                        ) : null}
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
            ) : itemA && itemB ? (
              <p className="text-muted-foreground py-6 text-center">
                No recipe found for these items
              </p>
            ) : (
              <p className="text-muted-foreground py-6 text-center">
                Select two items to see results
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reverse lookup */}
      <div className="w-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl tracking-wide sm:text-3xl">Reverse Lookup</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick a result to see every combination that creates it
          </p>
        </div>

        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <ItemPicker
              items={resultItems}
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
        </div>

        {targetItem && (
          <ReverseTable rows={reverseRows} targetMaterial={targetMaterial} />
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
}

function ReverseTable({
  rows,
  targetMaterial,
}: {
  rows: ReverseRow[]
  targetMaterial: string | null
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<ReverseRow>[]>(
    () => [
      {
        accessorKey: "input_1",
        header: "Slot 1",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.input_1}</span>
        ),
      },
      {
        accessorKey: "input_2",
        header: "Slot 2",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.input_2}</span>
        ),
      },
      ...(targetMaterial
        ? [
            {
              id: "materials",
              header: "Material Paths",
              enableSorting: false,
              cell: ({ row }: { row: { original: ReverseRow } }) => {
                const combos = row.original.materialCombos
                if (combos.length === 0) return null
                return (
                  <div className="space-y-1">
                    {combos.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <MaterialBadge mat={c.mat1} />
                        <span className="text-muted-foreground text-xs">+</span>
                        <MaterialBadge mat={c.mat2} />
                      </div>
                    ))}
                  </div>
                )
              },
            } satisfies ColumnDef<ReverseRow>,
          ]
        : []),
      {
        accessorKey: "tier",
        header: "Tier",
        cell: ({ getValue }) => <TierValue value={getValue<number>()} />,
      },
    ],
    [targetMaterial]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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
