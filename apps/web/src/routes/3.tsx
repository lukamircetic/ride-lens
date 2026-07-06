import { createFileRoute } from "@tanstack/react-router";

import { ContourDesign } from "../features/designs/contour";

export const Route = createFileRoute("/3")({
  component: ContourDesign,
  head: () => ({
    meta: [{ title: "Ride Lens · Contour" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Overpass+Mono:wght@400;600;700;800&family=Overpass:wght@400;600;700;800;900&display=swap",
      },
    ],
  }),
});
