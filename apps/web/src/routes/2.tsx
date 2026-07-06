import { createFileRoute } from "@tanstack/react-router";

import { ZoneDesign } from "../features/designs/zone";

export const Route = createFileRoute("/2")({
  component: ZoneDesign,
  head: () => ({
    meta: [{ title: "Ride Lens · Zone" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
});
