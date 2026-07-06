import { createFileRoute } from "@tanstack/react-router";

import { HeatmapDesign } from "../features/designs/heatmap";

export const Route = createFileRoute("/5")({
  component: HeatmapDesign,
  head: () => ({
    meta: [{ title: "Ride Lens · Heatmap" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
});
