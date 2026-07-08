import { createFileRoute } from "@tanstack/react-router";

import { SegmentDashboard } from "../features/segments/dashboard";

export const Route = createFileRoute("/segments")({
  component: SegmentDashboard,
});
