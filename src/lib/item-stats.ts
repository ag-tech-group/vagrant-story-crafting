import type { Material } from "@/lib/api"

export interface ItemStats {
  str: number
  int: number
  agi: number
  range?: number
  damage?: number
  risk?: number
  gem_slots?: number
  damage_type?: string
}

export interface EffectiveStats extends ItemStats {
  human?: number
  beast?: number
  undead?: number
  phantom?: number
  dragon?: number
  evil?: number
  fire?: number
  water?: number
  wind?: number
  earth?: number
  light?: number
  dark?: number
}

export function computeEffectiveStats(
  base: ItemStats,
  material: Material
): EffectiveStats {
  return {
    ...base,
    str: base.str + material.str_modifier,
    int: base.int + material.int_modifier,
    agi: base.agi + material.agi_modifier,
    human: material.human,
    beast: material.beast,
    undead: material.undead,
    phantom: material.phantom,
    dragon: material.dragon,
    evil: material.evil,
    fire: material.fire,
    water: material.water,
    wind: material.wind,
    earth: material.earth,
    light: material.light,
    dark: material.dark,
  }
}

export function statDiff(a: number, b: number): number {
  return a - b
}
