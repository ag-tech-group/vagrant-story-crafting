import { createFileRoute } from "@tanstack/react-router"
import { RootErrorComponent } from "@/components/error-boundary"
import { CalculatorPage } from "@/pages/calculator/calculator-page"

export type CalculatorSearch = {
  s1?: string
  s2?: string
  m1?: string
  m2?: string
  target?: string
  tmat?: string
  cat?: string
  rcat?: string
}

export const Route = createFileRoute("/")({
  component: CalculatorPage,
  errorComponent: RootErrorComponent,
  validateSearch: (search: Record<string, unknown>): CalculatorSearch => ({
    s1: typeof search.s1 === "string" ? search.s1 : undefined,
    s2: typeof search.s2 === "string" ? search.s2 : undefined,
    m1: typeof search.m1 === "string" ? search.m1 : undefined,
    m2: typeof search.m2 === "string" ? search.m2 : undefined,
    target: typeof search.target === "string" ? search.target : undefined,
    tmat: typeof search.tmat === "string" ? search.tmat : undefined,
    cat: typeof search.cat === "string" ? search.cat : undefined,
    rcat: typeof search.rcat === "string" ? search.rcat : undefined,
  }),
})
