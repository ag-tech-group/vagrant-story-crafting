import { ThemeProvider } from "@/components/theme-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { act, render, type RenderOptions } from "@testing-library/react"
import React from "react"

import { routeTree } from "@/routeTree.gen"

interface RenderWithFileRoutesOptions extends Omit<RenderOptions, "wrapper"> {
  initialLocation?: string
}

export async function renderWithFileRoutes(
  ui: React.ReactElement,
  { initialLocation = "/", ...renderOptions }: RenderWithFileRoutesOptions = {}
) {
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  const memoryHistory = createMemoryHistory({
    initialEntries: [initialLocation],
  })

  const testRouter = createRouter({
    routeTree,
    history: memoryHistory,
    context: { queryClient: testQueryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultPendingMinMs: 0,
  })

  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider>
          <RouterProvider router={testRouter} />
          {ui}
        </ThemeProvider>
      </QueryClientProvider>,
      renderOptions
    )
  })

  return {
    ...result!,
    router: testRouter,
    queryClient: testQueryClient,
    history: memoryHistory,
  }
}
