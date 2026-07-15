import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";

import { addReplayLayers, updateReplayLayerData } from "../style/layers";
import type { RideReplayController } from "./replay-types";

export function useReplayMapEffects({
  map,
  replay,
  accentColor,
}: {
  readonly map: MapLibreMap | null;
  readonly replay: RideReplayController;
  readonly accentColor?: string;
}) {
  const lastCameraUpdateRef = useRef(0);
  const { cameraMode, enabled, frame } = replay;

  useEffect(() => {
    if (!map) return;

    addReplayLayers(map);
    updateReplayLayerData(
      map,
      enabled ? frame.trailCoordinates : [],
      enabled ? frame.coordinate : null,
      accentColor,
    );
  }, [accentColor, enabled, frame.coordinate, frame.trailCoordinates, map]);

  useEffect(() => {
    if (!enabled || !map || frame.coordinate === null) return;

    const now = performance.now();
    if (now - lastCameraUpdateRef.current < 160) return;
    lastCameraUpdateRef.current = now;

    if (cameraMode === "static") {
      if (map.getPitch() !== 0 || map.getBearing() !== 0) {
        map.easeTo({ bearing: 0, duration: 260, pitch: 0 });
      }
      return;
    }

    map.easeTo({
      bearing: 0,
      center: [...frame.coordinate],
      duration: 140,
      pitch: 0,
      zoom: Math.max(map.getZoom(), 14.5),
    });
  }, [cameraMode, enabled, frame.coordinate, frame.headingDegrees, map]);
}
