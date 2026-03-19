import { useCallback, useMemo, useState } from "react"
import { getRouteApi } from "@tanstack/react-router"
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
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { StatDisplay } from "@/components/stat-display"
import {
  api,
  type CraftingRecipe,
  type Material,
  type MaterialRecipe,
} from "@/lib/api"
import { computeEffectiveStats, type ItemStats } from "@/lib/item-stats"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<string, string> = {
  AxeMace: "Axe / Mace",
}

const WEAPON_HANDS: Record<string, string> = {
  Dagger: "1H",
  Sword: "1H",
  Axe: "1H",
  Mace: "1H",
  "Great Sword": "2H",
  "Great Axe": "2H",
  "Heavy Mace": "2H",
  Polearm: "2H",
  Staff: "2H",
  Crossbow: "2H",
}

function typeLabel(type: string) {
  return TYPE_LABELS[type] ?? type
}

function typeLabelWithHands(type: string) {
  const label = TYPE_LABELS[type] ?? type
  const hands = WEAPON_HANDS[type]
  return hands ? `${label} · ${hands}` : label
}

const ALL_MATERIALS = [
  "Wood",
  "Leather",
  "Bronze",
  "Iron",
  "Hagane",
  "Silver",
  "Damascus",
]

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

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

const routeApi = getRouteApi("/")

export function CalculatorPage() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const updateSearch = useCallback(
    (updates: Record<string, string | undefined>) =>
      navigate({
        search: (prev: Record<string, string | undefined>) => {
          const next = { ...prev, ...updates }
          for (const key of Object.keys(next)) {
            if (!next[key]) delete next[key]
          }
          return next
        },
        replace: true,
      }),
    [navigate]
  )

  const itemA = search.s1 ?? null
  const itemB = search.s2 ?? null
  const materialA = search.m1 ?? null
  const materialB = search.m2 ?? null
  const targetItem = search.target ?? null
  const targetMaterial = search.tmat ?? null
  const categoryFilter = search.cat ?? "all"
  const reverseCategoryFilter = search.rcat ?? "all"

  const setItemA = (v: string | null) => updateSearch({ s1: v || undefined })
  const setItemB = (v: string | null) => updateSearch({ s2: v || undefined })
  const setMaterialA = (v: string | null) =>
    updateSearch({ m1: v || undefined })
  const setMaterialB = (v: string | null) =>
    updateSearch({ m2: v || undefined })
  const setTargetItem = (v: string | null) =>
    updateSearch({ target: v || undefined })
  const setTargetMaterial = (v: string | null) =>
    updateSearch({ tmat: v || undefined })
  const setCategoryFilter = (v: string) =>
    updateSearch({
      cat: v === "all" ? undefined : v,
      s1: undefined,
      s2: undefined,
      m1: undefined,
      m2: undefined,
    })
  const setReverseCategoryFilter = (v: string) =>
    updateSearch({ rcat: v === "all" ? undefined : v })

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
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: api.materials,
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
        damage_type: w.damage_type,
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
    // Case-insensitive fallback for recipe names that differ from API
    const lowerMap = new Map<string, ItemStats>()
    for (const [k, v] of map) lowerMap.set(k.toLowerCase(), v)
    for (const r of recipes) {
      for (const name of [r.input_1, r.input_2, r.result]) {
        if (!map.has(name)) {
          const stats = lowerMap.get(name.toLowerCase())
          if (stats) map.set(name, stats)
        }
      }
    }
    return map
  }, [weapons, armor, recipes])

  const materialMap = useMemo(() => {
    const map = new Map<string, Material>()
    for (const m of materials) map.set(m.name, m)
    return map
  }, [materials])

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

  // Map item name → 1H/2H for weapon badges
  const itemHandsMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of weapons) {
      const hands = WEAPON_HANDS[w.blade_type]
      if (hands) map.set(fmt(w.field_name), hands)
    }
    return map
  }, [weapons])

  // Map item name → equipment category for material filtering
  const equipCategoryMap = useMemo(() => {
    const map = new Map<string, "blade" | "armor" | "shield">()
    for (const w of weapons) map.set(fmt(w.field_name), "blade")
    for (const a of armor) {
      if (a.armor_type === "Shield") map.set(fmt(a.field_name), "shield")
      else map.set(fmt(a.field_name), "armor")
    }
    // Handle recipe items not in weapons/armor (e.g. shields from crafting)
    for (const r of recipes) {
      for (const name of [r.input_1, r.input_2, r.result]) {
        if (map.has(name)) continue
        if (r.category === "shield") map.set(name, "shield")
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weapons, armor, recipes])

  function getMaterialsForItem(itemName: string | null): string[] {
    if (!itemName) return ALL_MATERIALS
    const cat = equipCategoryMap.get(itemName)
    if (cat === "blade") return BLADE_MATS
    if (cat === "shield") return SHIELD_MATS
    if (cat === "armor") return ARMOR_MATS
    return ALL_MATERIALS
  }

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

  const resultCompareStats = useMemo(() => {
    if (results.length === 0) return undefined
    const base = itemStatsMap.get(results[0].result)
    if (!base) return undefined
    if (!materialResult) return base
    const mat = materialMap.get(materialResult.result_material)
    if (!mat) return base
    return computeEffectiveStats(base, mat)
  }, [results, itemStatsMap, materialResult, materialMap])

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

      const level1 = itemLevelMap.get(r.input_1)
      const level2 = itemLevelMap.get(r.input_2)

      return {
        id: r.id,
        input_1: r.input_1,
        input_2: r.input_2,
        category: r.category,
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
            onClick={() =>
              updateSearch({
                s1: undefined,
                s2: undefined,
                m1: undefined,
                m2: undefined,
                cat: undefined,
              })
            }
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        </div>
        <div className="flex w-full flex-col items-center gap-6 sm:flex-row sm:items-stretch">
          <ItemCard
            title="Slot 1"
            items={filteredItems}
            value={itemA}
            onSelect={(name) => {
              setItemA(name)
              if (
                materialA &&
                name &&
                !getMaterialsForItem(name).includes(materialA)
              )
                setMaterialA(null)
            }}
            material={materialA}
            onMaterialSelect={setMaterialA}
            availableMaterials={getMaterialsForItem(itemA)}
            stats={itemA ? itemStatsMap.get(itemA) : undefined}
            compareWith={resultCompareStats}
            materialData={materialA ? materialMap.get(materialA) : undefined}
          />

          <div className="flex shrink-0 flex-col items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateSearch({
                  s1: itemB || undefined,
                  s2: itemA || undefined,
                  m1: materialB || undefined,
                  m2: materialA || undefined,
                })
              }
              className="text-lg"
              title="Swap slots"
            >
              ⇄
            </Button>
            <Plus className="text-muted-foreground size-6" />
          </div>

          <ItemCard
            title="Slot 2"
            items={filteredItems}
            value={itemB}
            onSelect={(name) => {
              setItemB(name)
              if (
                materialB &&
                name &&
                !getMaterialsForItem(name).includes(materialB)
              )
                setMaterialB(null)
            }}
            material={materialB}
            onMaterialSelect={setMaterialB}
            availableMaterials={getMaterialsForItem(itemB)}
            stats={itemB ? itemStatsMap.get(itemB) : undefined}
            compareWith={resultCompareStats}
            materialData={materialB ? materialMap.get(materialB) : undefined}
          />

          <div className="flex shrink-0 items-center">
            <ArrowRight className="text-primary size-10" />
          </div>

          <Card className="border-primary/40 flex w-full flex-1 flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.length > 0 ? (
                results.map((r) => {
                  const resultStats = itemStatsMap.get(r.result)
                  const resultMat = materialResult
                    ? materialMap.get(materialResult.result_material)
                    : undefined
                  const effectiveStats =
                    resultStats && resultMat
                      ? computeEffectiveStats(resultStats, resultMat)
                      : resultStats

                  const resultType = allItems.find(
                    (i) => i.name === r.result
                  )?.type

                  return (
                    <div key={r.id} className="space-y-3">
                      {/* Item name — mimics ItemPicker trigger */}
                      <div className="flex min-h-12 items-center gap-2 rounded-md border px-3 py-2">
                        <div className="bg-muted size-8 shrink-0 rounded" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {r.result}
                        </span>
                        {resultType && (
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {typeLabelWithHands(resultType)}
                          </span>
                        )}
                      </div>
                      {/* Material — mimics MaterialSelect */}
                      <div className="flex h-10 items-center gap-1.5 rounded-md border px-3">
                        {materialResult ? (
                          <>
                            <MaterialBadge
                              mat={materialResult.result_material}
                            />
                            {materialResult.orderMatters && (
                              <span className="text-xs text-amber-400">*</span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Select materials...
                          </span>
                        )}
                      </div>
                      {/* Stats */}
                      {effectiveStats && (
                        <StatDisplay
                          stats={effectiveStats}
                          showAffinities={!!resultMat}
                        />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="space-y-3">
                  <div className="flex min-h-12 items-center justify-center rounded-md border px-3">
                    <span className="text-muted-foreground text-sm">
                      {itemA && itemB ? "No recipe found" : "Select two items"}
                    </span>
                  </div>
                  <div className="flex h-10 items-center rounded-md border px-3">
                    <span className="text-muted-foreground text-sm">
                      Select materials...
                    </span>
                  </div>
                </div>
              )}
              {materialResult?.orderMatters && (
                <p className="text-muted-foreground text-xs">
                  * Slot order affects the result material
                </p>
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
              onSelect={(name) => {
                setTargetItem(name)
                if (
                  targetMaterial &&
                  name &&
                  !getMaterialsForItem(name).includes(targetMaterial)
                )
                  setTargetMaterial(null)
              }}
              placeholder="Search for a result item..."
              formatType={typeLabelWithHands}
            />
          </div>
          <div className="sm:w-48">
            <MaterialSelect
              materials={getMaterialsForItem(targetItem)}
              value={targetMaterial}
              onSelect={setTargetMaterial}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              updateSearch({
                target: undefined,
                tmat: undefined,
                rcat: undefined,
              })
            }
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
            itemStatsMap={itemStatsMap}
            itemHandsMap={itemHandsMap}
            onLoadRecipe={(input1, input2, mat1, mat2) => {
              updateSearch({
                s1: input1 || undefined,
                s2: input2 || undefined,
                m1: mat1 || undefined,
                m2: mat2 || undefined,
                cat: undefined,
              })
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}
      </div>
    </div>
  )
}

function ItemCard({
  title,
  items,
  value,
  onSelect,
  material,
  onMaterialSelect,
  availableMaterials,
  stats,
  compareWith,
  materialData,
}: {
  title: string
  items: PickerItem[]
  value: string | null
  onSelect: (name: string | null) => void
  material: string | null
  onMaterialSelect: (material: string | null) => void
  availableMaterials: string[]
  stats?: ItemStats
  compareWith?: ItemStats
  materialData?: Material
}) {
  const effectiveStats =
    stats && materialData ? computeEffectiveStats(stats, materialData) : stats
  return (
    <Card className="w-full flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ItemPicker
          items={items}
          value={value}
          onSelect={onSelect}
          placeholder={`Choose ${title.toLowerCase()}...`}
          formatType={typeLabelWithHands}
        />
        <MaterialSelect
          materials={availableMaterials}
          value={material}
          onSelect={onMaterialSelect}
        />
        {effectiveStats && (
          <StatDisplay
            stats={effectiveStats}
            compareWith={compareWith}
            showAffinities={!!materialData}
          />
        )}
      </CardContent>
    </Card>
  )
}

// --- Reverse lookup table with TanStack Table ---

type ReverseRow = {
  id: number
  input_1: string
  input_2: string
  category: string
  materialCombos: { mat1: string; mat2: string }[]
  searchText: string
}

function ReverseTable({
  rows,
  targetMaterial,
  targetItem,
  itemTypeMap,
  itemStatsMap,
  itemHandsMap,
  onLoadRecipe,
}: {
  rows: ReverseRow[]
  targetMaterial: string | null
  targetItem: string | null
  itemTypeMap: Map<string, string>
  itemStatsMap: Map<string, ItemStats>
  itemHandsMap: Map<string, string>
  onLoadRecipe: (
    input1: string,
    input2: string,
    mat1: string | null,
    mat2: string | null
  ) => void
}) {
  const resultStats = targetItem ? itemStatsMap.get(targetItem) : undefined
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
            hands={itemHandsMap.get(row.original.input_1)}
            stats={itemStatsMap.get(row.original.input_1)}
            compareWith={resultStats}
            materials={
              targetMaterial
                ? [
                    ...new Set(row.original.materialCombos.map((c) => c.mat1)),
                  ].sort(
                    (a, b) =>
                      ALL_MATERIALS.indexOf(a) - ALL_MATERIALS.indexOf(b)
                  )
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
            hands={itemHandsMap.get(row.original.input_2)}
            stats={itemStatsMap.get(row.original.input_2)}
            compareWith={resultStats}
            materials={
              targetMaterial
                ? [
                    ...new Set(row.original.materialCombos.map((c) => c.mat2)),
                  ].sort(
                    (a, b) =>
                      ALL_MATERIALS.indexOf(a) - ALL_MATERIALS.indexOf(b)
                  )
                : undefined
            }
          />
        ),
      },
    ],
    [targetMaterial, itemTypeMap, itemStatsMap, itemHandsMap, resultStats]
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
      <div className="bg-card border-border/50 sticky top-14 z-10 space-y-3 border-b px-6 py-4">
        <p className="text-center text-base font-semibold">
          {table.getFilteredRowModel().rows.length} recipe
          {table.getFilteredRowModel().rows.length !== 1 && "s"} found
          {targetMaterial && (
            <span className="text-muted-foreground font-normal">
              {" "}
              · showing material paths for {targetMaterial}
            </span>
          )}
        </p>
        {targetItem && (
          <div className="flex justify-center">
            <SlotCell
              name={targetItem}
              type={itemTypeMap.get(targetItem)}
              hands={itemHandsMap.get(targetItem)}
              stats={itemStatsMap.get(targetItem)}
            />
          </div>
        )}
        {rows.length > 0 && (
          <div className="relative mx-auto max-w-sm">
            <Input
              placeholder="Filter results..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pr-8"
            />
            {globalFilter && (
              <button
                type="button"
                onClick={() => setGlobalFilter("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
      <CardContent className="space-y-3 overflow-x-auto">
        {rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-border border-b">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "text-muted-foreground w-1/2 px-3 py-2 text-center font-medium",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none"
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
              {table.getRowModel().rows.map((row) => {
                const r = row.original
                const mat1s = r.materialCombos.map((c) => c.mat1)
                const mat2s = r.materialCombos.map((c) => c.mat2)
                const lowestMat1 =
                  mat1s.length > 0
                    ? mat1s.sort(
                        (a, b) =>
                          ALL_MATERIALS.indexOf(a) - ALL_MATERIALS.indexOf(b)
                      )[0]
                    : null
                const lowestMat2 =
                  mat2s.length > 0
                    ? mat2s.sort(
                        (a, b) =>
                          ALL_MATERIALS.indexOf(a) - ALL_MATERIALS.indexOf(b)
                      )[0]
                    : null

                return (
                  <tr
                    key={row.id}
                    className="border-border/50 hover:bg-muted/30 cursor-pointer border-b last:border-0"
                    onClick={() =>
                      onLoadRecipe(r.input_1, r.input_2, lowestMat1, lowestMat2)
                    }
                    title="Click to load into calculator"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="w-1/2 px-3 py-2 text-center">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                )
              })}
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
  hands,
  stats,
  compareWith,
  materials,
}: {
  name: string
  type?: string
  hands?: string
  stats?: ItemStats
  compareWith?: ItemStats
  materials?: string[]
}) {
  return (
    <div className="inline-flex flex-col items-center">
      <div className="flex items-center gap-2">
        <div className="bg-muted size-6 shrink-0 rounded" />
        <span className="font-medium">{name}</span>
        {type && (
          <span className="text-muted-foreground text-xs">
            {typeLabel(type)}
            {hands && ` · ${hands}`}
          </span>
        )}
      </div>
      {stats && (
        <div className="mt-0.5">
          <StatDisplay stats={stats} compareWith={compareWith} compact />
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

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3.5" />
  if (sorted === "desc") return <ArrowDown className="size-3.5" />
  return <ArrowUpDown className="text-muted-foreground/50 size-3.5" />
}

function MaterialBadge({ mat }: { mat: string }) {
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-xs font-medium",
        MAT_BADGE_COLORS[mat] ?? "bg-muted"
      )}
    >
      {mat}
    </span>
  )
}
