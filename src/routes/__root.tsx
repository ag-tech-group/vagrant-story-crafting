import { lazy, Suspense } from "react"
import { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
} from "@tanstack/react-router"
import { Toaster } from "sonner"
import { RootErrorComponent } from "@/components/error-boundary"
import { ThemeToggle } from "@/components/theme-toggle"

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/react-router-devtools").then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RootErrorComponent,
})

function RootComponent() {
  return (
    <>
      <nav className="border-border/50 bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <a
              href="https://vagrant-story.criticalbit.gg"
              className="hover:text-primary font-sans text-lg tracking-wide transition-colors"
            >
              Vagrant Story
            </a>
            <div className="flex items-center gap-4 text-sm">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground [&.active]:text-foreground transition-colors"
              >
                Calculator
              </Link>
              <Link
                to="/materials"
                className="text-muted-foreground hover:text-foreground [&.active]:text-foreground transition-colors"
              >
                Materials
              </Link>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </nav>
      <div className="flex min-h-screen flex-col pt-14">
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
        <footer className="border-border/50 border-t px-4 py-3">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <p>
              &copy; {new Date().getFullYear()} AG Technology Group LLC. All
              rights reserved.
            </p>
            <div className="flex gap-4">
              <a
                href="https://criticalbit.gg"
                className="hover:text-foreground transition-colors"
              >
                criticalbit.gg
              </a>
              <a
                href="https://criticalbit.gg/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </a>
              <a
                href="https://criticalbit.gg/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
      </Suspense>
    </>
  )
}
