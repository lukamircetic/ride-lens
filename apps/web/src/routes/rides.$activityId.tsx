import { createFileRoute } from "@tanstack/react-router";

import { RideDashboard } from "../features/rides/dashboard";

export const Route = createFileRoute("/rides/$activityId")({
  component: RideDetailRoute,
});

function RideDetailRoute() {
  const { activityId } = Route.useParams();
  return <RideDashboard initialActivityId={activityId} />;
}
