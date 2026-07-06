import { Toaster } from "@ride-lens/ui/components/sonner";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Ride Lens",
      },
      {
        name: "description",
        content: "Private cycling analytics dashboard for FIT activity files.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

const DESIGN_PATTERN = /^\/[1-5]\/?$/;

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDesign = DESIGN_PATTERN.test(pathname);

  if (isDesign) {
    return (
      <>
        <HeadContent />
        <Outlet />
      </>
    );
  }

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <Header />
          <Outlet />
        </div>
        <Toaster richColors />
      </ThemeProvider>
    </>
  );
}
