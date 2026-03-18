import { createFileRoute } from "@tanstack/react-router"
import { MaterialsPage } from "@/pages/materials/materials-page"

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
})
