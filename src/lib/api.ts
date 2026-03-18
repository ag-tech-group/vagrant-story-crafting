const API_URL = import.meta.env.VITE_API_URL || "/api"

export interface Weapon {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr: string
  blade_type: string
  damage_type: string
  risk: number
  str: number
  int: number
  agi: number
  range: number
  damage: number
}

export interface Armor {
  id: number
  game_id: number
  field_name: string
  name: string
  description_fr: string
  armor_type: string
  str: number
  int: number
  agi: number
  gem_slots: number
}

export interface Material {
  id: number
  name: string
  tier: number
  str_modifier: number
  int_modifier: number
  agi_modifier: number
  human: number
  beast: number
  undead: number
  phantom: number
  dragon: number
  evil: number
  fire: number
  water: number
  wind: number
  earth: number
  light: number
  dark: number
}

export interface CraftingRecipe {
  id: number
  category: string
  sub_category: string
  input_1: string
  input_2: string
  result: string
  tier_change: number
  has_swap: boolean
}

export interface MaterialRecipe {
  id: number
  category: string
  sub_category: string
  input_1: string
  input_2: string
  material_1: string
  material_2: string
  result_material: string
  tier_change: number
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  weapons: () => fetchApi<Weapon[]>("/weapons?limit=200"),
  armor: () => fetchApi<Armor[]>("/armor?limit=200"),
  materials: () => fetchApi<Material[]>("/materials"),
  craftingRecipes: (params?: string) =>
    fetchApi<CraftingRecipe[]>(
      `/crafting-recipes${params ? `?${params}` : "?limit=200"}`
    ),
  craftingSearch: (inputItem: string) =>
    fetchApi<CraftingRecipe[]>(
      `/crafting-recipes/search?input_item=${encodeURIComponent(inputItem)}`
    ),
  craftingResult: (resultItem: string) =>
    fetchApi<CraftingRecipe[]>(
      `/crafting-recipes/result?result_item=${encodeURIComponent(resultItem)}`
    ),
  materialRecipes: (params?: string) =>
    fetchApi<MaterialRecipe[]>(
      `/crafting-recipes/materials${params ? `?${params}` : "?limit=200"}`
    ),
}
