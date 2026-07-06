import { createFileRoute } from "@tanstack/react-router";

import { TarmacDesign } from "../features/designs/tarmac";

export const Route = createFileRoute("/1")({
  component: TarmacDesign,
  head: () => ({
    meta: [{ title: "Ride Lens · Tarmac" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Overpass+Mono:wght@400;600;700&family=Overpass:wght@400;600;700;800;900&display=swap",
      },
    ],
  }),
});
