import { createFileRoute } from "@tanstack/react-router";

import { MaillotDesign } from "../features/designs/maillot";

export const Route = createFileRoute("/4")({
  component: MaillotDesign,
  head: () => ({
    meta: [{ title: "Ride Lens · Mailhot" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
});
