import { createFileRoute } from "@tanstack/react-router"
import { CalculatorPage } from "@/pages/calculator/calculator-page"

export const Route = createFileRoute("/")({
  component: CalculatorPage,
})
