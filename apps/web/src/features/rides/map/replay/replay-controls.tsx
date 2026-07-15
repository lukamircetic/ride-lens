import { Button } from "@ride-lens/ui/components/button";
import { cn } from "@ride-lens/ui/lib/utils";
import { PauseIcon, PlayIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { formatDuration } from "../../formatters";
import { REPLAY_SPEED_MULTIPLIERS, type RideReplayController } from "./replay-types";

export function ReplayMapControls({
  replay,
  hidden,
  heartRateZone,
}: {
  readonly replay: RideReplayController;
  readonly hidden: boolean;
  readonly heartRateZone: {
    readonly number: 1 | 2 | 3 | 4 | 5 | null;
    readonly name: string;
    readonly color: string;
    readonly heartRateBpm: number;
  } | null;
}) {
  if (!replay.hasReplay || hidden) return null;

  if (!replay.enabled) {
    return (
      <Button
        type="button"
        variant="unstyled"
        className="absolute right-3 bottom-[50px] z-[2] inline-flex h-10 items-center gap-2 border border-ride-line bg-[#10161c]/96 px-3 font-ride text-[10px] font-bold uppercase text-ride-ink shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur transition-colors hover:border-ride-amber hover:text-ride-amber"
        aria-label="Show replay controls"
        onClick={() => replay.setEnabled(true)}
      >
        <PlayIcon className="size-[15px] text-ride-amber" />
        Replay
      </Button>
    );
  }

  return (
    <div className="absolute right-3 bottom-3 z-[2] w-[min(330px,calc(100%-24px))] border border-ride-line bg-ride-line-soft shadow-[0_16px_38px_rgba(0,0,0,0.36)]">
      <div className="bg-[#10161c]/96 p-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="unstyled"
            className={iconButtonClassName(true)}
            aria-label={replay.playing ? "Pause replay" : "Play replay"}
            onClick={replay.togglePlaying}
          >
            {replay.playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
          <Button
            type="button"
            variant="unstyled"
            className={iconButtonClassName(false)}
            aria-label="Reset replay"
            onClick={replay.reset}
          >
            <RotateCcwIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-ride text-[10px] font-bold uppercase text-ride-ink-muted">
                Replay
              </span>
              <span className="font-ride-mono text-[10px] text-ride-ink-dim">
                {formatDuration(replay.elapsedSeconds)} / {formatDuration(replay.durationSeconds)}
              </span>
            </div>
            {heartRateZone ? (
              <div className="mt-1 flex items-center gap-1.5 font-ride-mono text-[9px] text-ride-ink-muted">
                <span
                  className="size-2"
                  style={{ backgroundColor: heartRateZone.color }}
                  aria-hidden="true"
                />
                <span>
                  {Math.round(heartRateZone.heartRateBpm)} bpm ·{" "}
                  {heartRateZone.number === null
                    ? heartRateZone.name
                    : `Z${heartRateZone.number} ${heartRateZone.name}`}
                </span>
              </div>
            ) : null}
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
          <Button
            type="button"
            variant="unstyled"
            className={iconButtonClassName(false)}
            aria-label="Hide replay controls"
            onClick={() => replay.setEnabled(false)}
          >
            <XIcon />
          </Button>
        </div>

        <div className="mt-2 grid gap-px bg-ride-line-soft">
          <div className="grid grid-cols-3 gap-px">
            {REPLAY_SPEED_MULTIPLIERS.map((speed) => (
              <Button
                key={speed}
                type="button"
                variant="unstyled"
                className={replayButtonClassName(replay.speedMultiplier === speed)}
                onClick={() => replay.setSpeedMultiplier(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px">
            <Button
              type="button"
              variant="unstyled"
              className={replayButtonClassName(replay.cameraMode === "static")}
              onClick={() => replay.setCameraMode("static")}
            >
              Static
            </Button>
            <Button
              type="button"
              variant="unstyled"
              className={replayButtonClassName(replay.cameraMode === "follow")}
              onClick={() => replay.setCameraMode("follow")}
            >
              Follow
            </Button>
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
      ? "border-[#7f6c2f] bg-[#2c2a20] text-ride-ink hover:bg-[#363120]"
      : "border-ride-line bg-[#12171d] text-ride-ink hover:border-ride-amber hover:text-ride-amber",
  );
}

function replayButtonClassName(active: boolean): string {
  return cn(
    "min-h-8 cursor-pointer bg-ride-abyss px-2 py-1.5 font-ride text-[10px] font-bold uppercase transition-colors",
    active
      ? "bg-[#2c2a20] text-ride-ink hover:bg-[#363120]"
      : "text-ride-ink-dim hover:text-ride-ink",
  );
}
