import { cn } from "@ride-lens/ui/lib/utils";
import { PauseIcon, PlayIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { formatDuration } from "../../formatters";
import { REPLAY_SPEED_MULTIPLIERS, type RideReplayController } from "./replay-types";

export function ReplayMapControls({
  replay,
  hidden,
}: {
  readonly replay: RideReplayController;
  readonly hidden: boolean;
}) {
  if (!replay.hasReplay || hidden) return null;

  if (!replay.enabled) {
    return (
      <button
        type="button"
        className="absolute bottom-[26px] left-[214px] z-[2] inline-flex h-10 items-center gap-2 border border-ride-line bg-[#10161c]/96 px-3 font-ride text-[10px] font-bold uppercase text-ride-ink shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur transition-colors hover:border-ride-amber hover:text-ride-amber max-[520px]:bottom-[76px] max-[520px]:left-3"
        aria-label="Show replay controls"
        onClick={() => replay.setEnabled(true)}
      >
        <PlayIcon className="size-[15px] text-ride-amber" />
        Replay
      </button>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 z-[2] w-[min(330px,calc(100%-24px))] border border-ride-line bg-ride-line-soft shadow-[0_16px_38px_rgba(0,0,0,0.36)]">
      <div className="bg-[#10161c]/96 p-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className={iconButtonClassName(true)}
            aria-label={replay.playing ? "Pause replay" : "Play replay"}
            onClick={replay.togglePlaying}
          >
            {replay.playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className={iconButtonClassName(false)}
            aria-label="Reset replay"
            onClick={replay.reset}
          >
            <RotateCcwIcon />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-muted">
                Replay
              </span>
              <span className="font-ride-mono text-[10px] text-ride-ink-dim">
                {formatDuration(replay.elapsedSeconds)} / {formatDuration(replay.durationSeconds)}
              </span>
            </div>
            <input
              className="mt-1 block w-full accent-ride-amber"
              type="range"
              min={0}
              max={1000}
              value={Math.round(replay.progress * 1000)}
              aria-label="Replay position"
              onChange={(event) => replay.seek(Number(event.currentTarget.value) / 1000)}
            />
          </div>
          <button
            type="button"
            className={iconButtonClassName(false)}
            aria-label="Hide replay controls"
            onClick={() => replay.setEnabled(false)}
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-2 grid gap-px bg-ride-line-soft">
          <div className="grid grid-cols-3 gap-px">
            {REPLAY_SPEED_MULTIPLIERS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={replayButtonClassName(replay.speedMultiplier === speed)}
                onClick={() => replay.setSpeedMultiplier(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px">
            <button
              type="button"
              className={replayButtonClassName(replay.cameraMode === "static")}
              onClick={() => replay.setCameraMode("static")}
            >
              Static
            </button>
            <button
              type="button"
              className={replayButtonClassName(replay.cameraMode === "follow")}
              onClick={() => replay.setCameraMode("follow")}
            >
              Follow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function iconButtonClassName(active: boolean): string {
  return cn(
    "grid size-8 cursor-pointer place-items-center border transition-colors disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]",
    active
      ? "border-ride-amber bg-ride-amber text-[#15120a]"
      : "border-ride-line bg-[#12171d] text-ride-ink hover:border-ride-amber hover:text-ride-amber",
  );
}

function replayButtonClassName(active: boolean): string {
  return cn(
    "min-h-8 cursor-pointer bg-ride-abyss px-2 py-1.5 font-ride text-[10px] font-bold uppercase transition-colors",
    active ? "text-ride-amber" : "text-ride-ink-dim hover:text-ride-ink",
  );
}
