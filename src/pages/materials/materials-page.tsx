import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api, type MaterialRecipe } from "@/lib/api"
import { cn } from "@/lib/utils"

type Category = "Blades" | "Armor" | "Shields"

const CATEGORIES: Category[] = ["Blades", "Armor", "Shields"]

const BLADE_TYPES = [
  "Heavy Mace",
  "Polearm",
  "Great Axe",
  "Great Sword",
  "Crossbow",
  "AxeMace",
  "Sword",
  "Staff",
  "Dagger",
]
const ARMOR_TYPES = ["Leg", "Arm", "Body", "Helm"]

const BLADE_MATS = ["Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const ARMOR_MATS = ["Leather", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]
const SHIELD_MATS = ["Wood", "Bronze", "Iron", "Hagane", "Silver", "Damascus"]

const TYPE_LABELS: Record<string, string> = { AxeMace: "Axe / Mace" }

const MAT_SHORT: Record<string, string> = {
  Wood: "W",
  Leather: "L",
  Bronze: "B",
  Iron: "I",
  Hagane: "H",
  Silver: "S",
  Damascus: "D",
}

const MAT_TIER: Record<string, number> = {
  Wood: 0,
  Leather: 1,
  Bronze: 2,
  Iron: 3,
  Hagane: 4,
  Silver: 5,
  Damascus: 6,
}

const CELL_COLORS: Record<string, string> = {
  Wood: "bg-amber-900/80 text-amber-100",
  Leather: "bg-amber-700/80 text-amber-100",
  Bronze: "bg-orange-600/80 text-orange-100",
  Iron: "bg-slate-500/80 text-slate-100",
  Hagane: "bg-blue-600/80 text-blue-100",
  Silver: "bg-gray-300/90 text-gray-900",
  Damascus: "bg-purple-600/80 text-purple-100",
}

const DOT_COLORS: Record<string, string> = {
  Wood: "bg-amber-800",
  Leather: "bg-amber-600",
  Bronze: "bg-orange-500",
  Iron: "bg-slate-400",
  Hagane: "bg-blue-400",
  Silver: "bg-gray-300",
  Damascus: "bg-purple-400",
}

const BLADE_DOMINANCE = [
  "Heavy Mace",
  "Polearm",
  "Great Axe",
  "Great Sword",
  "Crossbow",
  "AxeMace",
  "Sword",
  "Staff",
  "Dagger",
]

function label(type: string) {
  return TYPE_LABELS[type] ?? type
}

function getMaterials(cat: Category) {
  if (cat === "Blades") return BLADE_MATS
  if (cat === "Armor") return ARMOR_MATS
  return SHIELD_MATS
}

function getTypes(cat: Category) {
  if (cat === "Blades") return BLADE_TYPES
  if (cat === "Armor") return ARMOR_TYPES
  return ["Shield"]
}

// Nested lookup: [input_1][input_2][material_1][material_2] → { result, tier_change }
type Cell = { result: string; tier_change: number }
type Lookup = Record<
  string,
  Record<string, Record<string, Record<string, Cell>>>
>

function buildLookup(recipes: MaterialRecipe[]): Lookup {
  const out: Lookup = {}
  for (const r of recipes) {
    ;((out[r.input_1] ??= {})[r.input_2] ??= {})[r.material_1] ??= {}
    out[r.input_1][r.input_2][r.material_1][r.material_2] = {
      result: r.result_material,
      tier_change: r.tier_change,
    }
  }
  return out
}

export function MaterialsPage() {
  const [category, setCategory] = useState<Category>("Blades")
  const [type1, setType1] = useState("Heavy Mace")
  const [type2, setType2] = useState("Heavy Mace")

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["material-recipes"],
    queryFn: () => api.materialRecipes("limit=10000"),
  })

  const lookup = useMemo(() => buildLookup(recipes), [recipes])

  const materials = getMaterials(category)
  const types = getTypes(category)

  const changeCategory = (cat: Category) => {
    setCategory(cat)
    const t = getTypes(cat)
    setType1(t[0])
    setType2(t[0])
  }

  const swap = () => {
    setType1(type2)
    setType2(type1)
  }

  const grid = lookup[type1]?.[type2]
  const reverseGrid = lookup[type2]?.[type1]

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 lg:p-10">
      <div className="text-center">
        <h1 className="text-4xl tracking-wide sm:text-5xl lg:text-6xl">
          Material Combinations
        </h1>
        <p className="text-muted-foreground mt-3 text-base lg:text-lg">
          What material results from combining two equipment pieces
        </p>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Category tabs */}
        <div className="border-border flex border-b">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => changeCategory(cat)}
              className={cn(
                "-mb-px px-6 py-2.5 text-sm font-medium transition-colors",
                category === cat
                  ? "border-primary text-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Type pair selector */}
        {category !== "Shields" && (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex-1">
                <span className="text-muted-foreground mb-1 block text-xs font-medium">
                  Slot 1
                </span>
                <Select value={type1} onValueChange={setType1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={swap}
                className="text-muted-foreground hover:text-foreground mt-5 shrink-0 px-1 text-lg transition-colors"
                title="Swap slots"
              >
                ⇄
              </button>
              <div className="flex-1">
                <span className="text-muted-foreground mb-1 block text-xs font-medium">
                  Slot 2
                </span>
                <Select value={type2} onValueChange={setType2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {label(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {category === "Shields"
                ? "Shield Materials"
                : `${label(type1)} + ${label(type2)}`}
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Cell = result material from combining Slot 1 and Slot 2
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Loading...
              </p>
            ) : grid ? (
              <MaterialGrid
                grid={grid}
                reverseGrid={reverseGrid}
                materials={materials}
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No data for this combination
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-sm border-2 border-green-400" />{" "}
            Upgrade
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-sm border-2 border-red-400" />{" "}
            Downgrade
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-amber-300">✱</span> Order matters
          </span>
          <span className="mx-1">|</span>
          {materials.map((m) => (
            <span key={m} className="flex items-center gap-1">
              <span className={cn("size-2 rounded-full", DOT_COLORS[m])} />
              {m}
            </span>
          ))}
        </div>

        {/* Notes */}
        <Card>
          <CardContent className="pt-6">
            {category === "Blades" && (
              <BladeNotes type1={type1} type2={type2} />
            )}
            {category === "Armor" && <ArmorNotes />}
            {category === "Shields" && <ShieldNotes />}
          </CardContent>
        </Card>
        {/* Attribution */}
        <p className="text-muted-foreground text-center text-xs">
          Material data based on Jay Tilton's{" "}
          <a
            href="https://gamefaqs.gamespot.com/ps/914326-vagrant-story/faqs/10457"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Combination Guide
          </a>{" "}
          (GameFAQs, 2000)
        </p>
      </div>
    </div>
  )
}

function MaterialGrid({
  grid,
  reverseGrid,
  materials,
}: {
  grid: Record<string, Record<string, Cell>>
  reverseGrid?: Record<string, Record<string, Cell>>
  materials: string[]
}) {
  return (
    <div className="flex justify-center overflow-x-auto">
      <table className="border-collapse text-center">
        <thead>
          <tr>
            <th colSpan={2} />
            <th
              colSpan={materials.length}
              className="text-muted-foreground pb-1 text-[10px] font-normal"
            >
              Slot 2
            </th>
          </tr>
          <tr>
            <th colSpan={2} />
            {materials.map((m) => (
              <th key={m} className="p-1.5">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn("size-2.5 rounded-full", DOT_COLORS[m])}
                  />
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {MAT_SHORT[m]}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {materials.map((mat1, i) => (
            <tr key={mat1}>
              {i === 0 && (
                <td
                  rowSpan={materials.length}
                  className="text-muted-foreground pr-2 align-middle text-[10px] font-normal"
                  style={{
                    writingMode: "vertical-lr",
                    textOrientation: "mixed",
                  }}
                >
                  Slot 1
                </td>
              )}
              <td className="p-1.5">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-muted-foreground text-[11px] font-medium">
                    {MAT_SHORT[mat1]}
                  </span>
                  <span
                    className={cn("size-2.5 rounded-full", DOT_COLORS[mat1])}
                  />
                </div>
              </td>
              {materials.map((mat2) => {
                const cell = grid[mat1]?.[mat2]
                if (!cell) {
                  return (
                    <td key={mat2} className="p-1">
                      <div className="bg-muted/30 mx-auto flex size-10 items-center justify-center rounded-md text-xs">
                        —
                      </div>
                    </td>
                  )
                }

                const { result } = cell
                const upgrade =
                  MAT_TIER[result] > MAT_TIER[mat1] &&
                  MAT_TIER[result] > MAT_TIER[mat2]
                const downgrade =
                  MAT_TIER[result] < MAT_TIER[mat1] &&
                  MAT_TIER[result] < MAT_TIER[mat2]
                const rev = reverseGrid?.[mat2]?.[mat1]
                const nonComm = rev != null && rev.result !== result

                return (
                  <td key={mat2} className="p-1">
                    <div
                      className={cn(
                        "relative mx-auto flex size-10 items-center justify-center rounded-md text-xs font-bold ring-2 ring-inset",
                        CELL_COLORS[result] ?? "bg-muted",
                        upgrade
                          ? "ring-green-400"
                          : downgrade
                            ? "ring-red-400"
                            : "ring-transparent"
                      )}
                      title={`Slot 1: ${mat1} + Slot 2: ${mat2} → ${result}${upgrade ? " (upgrade)" : ""}${downgrade ? " (downgrade)" : ""}${nonComm ? " (swap gives " + rev!.result + ")" : ""}`}
                    >
                      {MAT_SHORT[result]}
                      {nonComm && (
                        <span className="absolute -top-1 -right-1 text-[10px] leading-none font-bold text-amber-300">
                          ✱
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BladeNotes({ type1, type2 }: { type1: string; type2: string }) {
  const same = type1 === type2
  return (
    <div className="text-muted-foreground space-y-3 text-sm">
      {same ? (
        <>
          <p>
            <span className="text-foreground font-medium">
              Same-type combinations:{" "}
            </span>
            Bronze + Iron = Hagane is the primary upgrade path. Silver and
            Damascus are preserved when combined with each other but cannot be
            created from lower materials.
          </p>
        </>
      ) : (
        <>
          <p>
            <span className="text-foreground font-medium">
              Cross-type rule:{" "}
            </span>
            The dominant type's material is preserved. A few exceptions are
            marked with <span className="text-amber-400">✱</span>.
          </p>
          <p className="text-xs leading-relaxed">
            <span className="font-medium">Dominance: </span>
            {BLADE_DOMINANCE.map((t, i) => (
              <span key={t}>
                <span
                  className={cn(
                    (t === type1 || t === type2) && "text-primary font-semibold"
                  )}
                >
                  {label(t)}
                </span>
                {i < BLADE_DOMINANCE.length - 1 && " › "}
              </span>
            ))}
          </p>
        </>
      )}
      <p className="text-xs">
        Special blades (Holy Win, Rhomphaia, Hand of Light) preserve the other
        blade's form but apply their own material — useful for material
        conversion.
      </p>
    </div>
  )
}

function ArmorNotes() {
  return (
    <div className="text-muted-foreground space-y-3 text-sm">
      <p>
        <span className="text-foreground font-medium">Same-type: </span>
        Leather/Bronze + Iron = Hagane. Silver requires Leather + Hagane (Helm +
        Arm). Damascus requires Silver in the mix.
      </p>
      <p>
        <span className="text-foreground font-medium">
          Cross-type dominance:{" "}
        </span>
        Leg {">"} Arm {">"} Body {">"} Helm — the dominant type's material tends
        to be preserved. Leather items are key for Damascus upgrade paths.
      </p>
    </div>
  )
}

function ShieldNotes() {
  return (
    <div className="text-muted-foreground space-y-3 text-sm">
      <p>
        <span className="text-foreground font-medium">
          Shield-only upgrade:{" "}
        </span>
        Bronze + Hagane = Silver — this path doesn't exist for blades or armor.
      </p>
      <p>
        Creating Damascus shields from lower materials appears to be impossible.
      </p>
    </div>
  )
}
