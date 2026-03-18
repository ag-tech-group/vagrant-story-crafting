import { createFileRoute } from "@tanstack/react-router"
import { RootErrorComponent } from "@/components/error-boundary"
import { MaterialsPage } from "@/pages/materials/materials-page"

export type MaterialsSearch = {
  cat?: string
  t1?: string
  t2?: string
}

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
  errorComponent: RootErrorComponent,
  validateSearch: (search: Record<string, unknown>): MaterialsSearch => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
    t1: typeof search.t1 === "string" ? search.t1 : undefined,
    t2: typeof search.t2 === "string" ? search.t2 : undefined,
  }),
})
