import { createFileRoute } from "@tanstack/react-router";

import { RideDashboard } from "../features/rides/dashboard";

export const Route = createFileRoute("/")({
  component: RideDashboard,
});
