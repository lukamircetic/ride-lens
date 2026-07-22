import type { SaveHeartRateZoneProfilePayload } from "@ride-lens/api";
import {
  estimateMaximumHeartRate,
  resolveHeartRateZones,
  type HeartRateZoneMethod,
} from "@ride-lens/heart-rate-zones";
import { Button } from "@ride-lens/ui/components/button";
import { cn } from "@ride-lens/ui/lib/utils";
import { PencilIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatHeartRateZoneRange,
  heartRateZoneMethodLabel,
  HEART_RATE_ZONE_COLORS,
} from "../heart-rate-zones";
import type { HeartRateZoneProfile } from "../types";

const inputClassName =
  "h-9 w-full border border-ride-line bg-ride-night-2 px-2.5 font-ride-mono text-base text-ride-ink outline-none transition-colors placeholder:text-ride-ink-dim focus:border-ride-amber focus:ring-1 focus:ring-ride-amber/25 sm:text-[13px]";

const methodOptions: ReadonlyArray<{
  readonly method: HeartRateZoneMethod;
  readonly label: string;
  readonly description: string;
}> = [
  {
    method: "percentMax",
    label: "% maximum",
    description: "A familiar five-zone starting point.",
  },
  {
    method: "heartRateReserve",
    label: "HR reserve",
    description: "Uses maximum and resting heart rate.",
  },
  {
    method: "custom",
    label: "Custom BPM",
    description: "Match your device or coach exactly.",
  },
];

export function HeartRateZoneProfilePanel({
  profile,
  saving,
  error,
  onSave,
}: {
  readonly profile: HeartRateZoneProfile | null;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onSave: (payload: SaveHeartRateZoneProfilePayload) => Promise<void>;
}) {
  const [editing, setEditing] = useState(profile === null);
  const [method, setMethod] = useState<HeartRateZoneMethod>(profile?.method ?? "percentMax");
  const [maximumHeartRate, setMaximumHeartRate] = useState(
    profile?.maximumHeartRateBpm?.toString() ?? "",
  );
  const [maximumSource, setMaximumSource] = useState<"entered" | "ageEstimate">(
    profile?.maximumHeartRateSource ?? "entered",
  );
  const [restingHeartRate, setRestingHeartRate] = useState(
    profile?.restingHeartRateBpm?.toString() ?? "",
  );
  const [age, setAge] = useState("");
  const [customBounds, setCustomBounds] = useState<ReadonlyArray<string>>(
    profile?.customLowerBoundsBpm?.map(String) ?? ["", "", "", "", ""],
  );
  const [formError, setFormError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      return resolveHeartRateZones(
        profileValues(method, maximumHeartRate, restingHeartRate, customBounds),
      );
    } catch {
      return null;
    }
  }, [customBounds, maximumHeartRate, method, restingHeartRate]);

  const resetFromProfile = () => {
    setMethod(profile?.method ?? "percentMax");
    setMaximumHeartRate(profile?.maximumHeartRateBpm?.toString() ?? "");
    setMaximumSource(profile?.maximumHeartRateSource ?? "entered");
    setRestingHeartRate(profile?.restingHeartRateBpm?.toString() ?? "");
    setCustomBounds(profile?.customLowerBoundsBpm?.map(String) ?? ["", "", "", "", ""]);
    setAge("");
    setFormError(null);
  };

  const handleMethodChange = (nextMethod: HeartRateZoneMethod) => {
    setMethod(nextMethod);
    setFormError(null);
    if (nextMethod === "custom" && customBounds.every((value) => value === "")) {
      const maximum = parseWholeNumber(maximumHeartRate);
      if (maximum !== null) {
        const suggested = resolveHeartRateZones({
          method: "percentMax",
          maximumHeartRateBpm: maximum,
          restingHeartRateBpm: null,
          customLowerBoundsBpm: null,
        });
        setCustomBounds(suggested.map(({ lowerBpm }) => String(lowerBpm)));
      }
    }
  };

  const handleEstimate = () => {
    const ageYears = parseWholeNumber(age);
    if (ageYears === null) {
      setFormError("Enter your age to calculate an estimated maximum.");
      return;
    }

    try {
      setMaximumHeartRate(String(estimateMaximumHeartRate(ageYears)));
      setMaximumSource("ageEstimate");
      setFormError(null);
    } catch (estimateError) {
      setFormError(
        estimateError instanceof Error ? estimateError.message : "Could not estimate maximum HR.",
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      const values = profileValues(method, maximumHeartRate, restingHeartRate, customBounds);
      resolveHeartRateZones(values);
      const payload: SaveHeartRateZoneProfilePayload =
        method === "custom"
          ? {
              method,
              maximumHeartRateBpm: null,
              maximumHeartRateSource: null,
              restingHeartRateBpm: null,
              customLowerBoundsBpm: values.customLowerBoundsBpm,
            }
          : {
              method,
              maximumHeartRateBpm: values.maximumHeartRateBpm,
              maximumHeartRateSource: maximumSource,
              restingHeartRateBpm:
                method === "heartRateReserve" ? values.restingHeartRateBpm : null,
              customLowerBoundsBpm: null,
            };
      await onSave(payload);
      setEditing(false);
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : "Check the zone values and try again.",
      );
    }
  };

  if (!editing && profile) {
    return (
      <div className="border border-ride-line bg-ride-abyss p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-ride text-[11px] font-bold uppercase text-ride-ink-muted">
              Cycling profile · {heartRateZoneMethodLabel(profile)}
            </div>
            <div className="mt-1 font-ride-mono text-[11px] text-ride-ink-dim">
              {profile.maximumHeartRateBpm === null
                ? "Personal BPM boundaries"
                : `${profile.maximumHeartRateBpm} bpm maximum${profile.maximumHeartRateSource === "ageEstimate" ? " · estimated" : ""}`}
            </div>
          </div>
          <Button
            type="button"
            variant="unstyled"
            className="inline-flex h-8 items-center gap-2 border border-ride-line bg-ride-night-2 px-3 font-ride text-[10px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber"
            onClick={() => {
              resetFromProfile();
              setEditing(true);
            }}
          >
            Edit zones <PencilIcon className="size-3" />
          </Button>
        </div>
        <ZonePreview zones={profile.zones} />
      </div>
    );
  }

  return (
    <form className="border border-ride-line bg-ride-abyss" onSubmit={handleSubmit}>
      <div className="border-b border-ride-line px-4 py-3.5">
        <div className="font-ride text-[13px] font-bold uppercase text-ride-ink">
          {profile ? "Edit cycling zones" : "Set up cycling zones"}
        </div>
        <p className="mt-1 max-w-[72ch] font-ride text-xs leading-5 text-ride-ink-dim">
          Pick the method your training plan uses. Ride Lens applies the saved boundaries to every
          ride without changing the original FIT data.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-px bg-ride-line-soft max-[720px]:grid-cols-1">
        {methodOptions.map((option) => (
          <Button
            key={option.method}
            type="button"
            variant="unstyled"
            className={cn(
              "min-h-[72px] bg-ride-night-2 px-4 py-3 text-left transition-colors",
              option.method === method
                ? "bg-[#242b2d] shadow-[inset_0_-2px_var(--amber)]"
                : "hover:bg-ride-abyss",
            )}
            aria-pressed={option.method === method}
            onClick={() => handleMethodChange(option.method)}
          >
            <span className="block font-ride text-[11px] font-bold uppercase text-ride-ink">
              {option.label}
            </span>
            <span className="mt-1 block font-ride text-[11px] leading-4 text-ride-ink-dim">
              {option.description}
            </span>
          </Button>
        ))}
      </div>

      <div className="p-4">
        {method === "custom" ? (
          <div className="grid grid-cols-5 gap-2.5 max-[720px]:grid-cols-2">
            {customBounds.map((value, index) => (
              <label key={index} className="block">
                <span className="mb-1.5 block font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
                  Z{index + 1} begins
                </span>
                <input
                  className={inputClassName}
                  type="number"
                  min={40}
                  max={240}
                  inputMode="numeric"
                  value={value}
                  placeholder="bpm"
                  onChange={(event) => {
                    const next = [...customBounds];
                    next[index] = event.currentTarget.value;
                    setCustomBounds(next);
                  }}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(180px,0.7fr)_minmax(280px,1.3fr)] gap-5 max-[720px]:grid-cols-1">
            <div className={cn("grid gap-3", method === "heartRateReserve" && "grid-cols-2")}>
              <label className="block">
                <span className="mb-1.5 block font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
                  Maximum heart rate
                </span>
                <input
                  className={inputClassName}
                  type="number"
                  min={80}
                  max={240}
                  inputMode="numeric"
                  value={maximumHeartRate}
                  placeholder="e.g. 190"
                  onChange={(event) => {
                    setMaximumHeartRate(event.currentTarget.value);
                    setMaximumSource("entered");
                  }}
                />
              </label>
              {method === "heartRateReserve" ? (
                <label className="block">
                  <span className="mb-1.5 block font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
                    Resting heart rate
                  </span>
                  <input
                    className={inputClassName}
                    type="number"
                    min={30}
                    max={150}
                    inputMode="numeric"
                    value={restingHeartRate}
                    placeholder="e.g. 52"
                    onChange={(event) => setRestingHeartRate(event.currentTarget.value)}
                  />
                </label>
              ) : null}
            </div>
            <div className="border-l border-ride-line pl-5 max-[720px]:border-t max-[720px]:border-l-0 max-[720px]:pt-4 max-[720px]:pl-0">
              <div className="font-ride text-[10px] font-bold uppercase text-ride-ink-dim">
                Don’t know your maximum?
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className={cn(inputClassName, "max-w-[140px]")}
                  type="number"
                  min={10}
                  max={100}
                  inputMode="numeric"
                  value={age}
                  placeholder="Age"
                  aria-label="Age for maximum heart-rate estimate"
                  onChange={(event) => setAge(event.currentTarget.value)}
                />
                <Button
                  type="button"
                  variant="unstyled"
                  className="h-9 border border-ride-line bg-ride-night-2 px-3 font-ride text-[10px] font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber"
                  onClick={handleEstimate}
                >
                  Use estimate
                </Button>
              </div>
              <p className="mt-2 font-ride text-[10px] leading-4 text-ride-ink-dim">
                Uses 208 − 0.7 × age. Treat it as a starting point, not a measured maximum.
              </p>
            </div>
          </div>
        )}

        {preview ? <ZonePreview zones={preview} /> : null}
        {formError || error ? (
          <div className="mt-4 border-l-2 border-ride-danger pl-3 font-ride text-xs text-[#e6a59d]">
            {formError ?? error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {profile ? (
            <Button
              type="button"
              variant="unstyled"
              className="h-9 border border-ride-line px-4 font-ride text-[10px] font-bold uppercase text-ride-ink-muted hover:text-ride-ink"
              onClick={() => {
                resetFromProfile();
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="unstyled"
            className="h-9 border border-ride-amber bg-ride-amber px-4 font-ride text-[10px] font-bold uppercase text-[#15120a] transition-colors hover:bg-ride-amber-bright disabled:opacity-50"
            disabled={saving || preview === null}
          >
            {saving ? "Saving zones" : "Save and recalculate rides"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ZonePreview({ zones }: { readonly zones: ReturnType<typeof resolveHeartRateZones> }) {
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden" aria-hidden="true">
        {zones.map((zone) => (
          <span
            key={zone.number}
            className="flex-1"
            style={{ backgroundColor: HEART_RATE_ZONE_COLORS[zone.number] }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2 max-[720px]:grid-cols-2">
        {zones.map((zone) => (
          <div key={zone.number} className="min-w-0">
            <div className="font-ride text-[9px] font-bold uppercase text-ride-ink-dim">
              Z{zone.number} {zone.name}
            </div>
            <div className="mt-0.5 font-ride-mono text-[11px] text-ride-ink">
              {formatHeartRateZoneRange(zone)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function profileValues(
  method: HeartRateZoneMethod,
  maximumHeartRate: string,
  restingHeartRate: string,
  customBounds: ReadonlyArray<string>,
) {
  return {
    method,
    maximumHeartRateBpm: method === "custom" ? null : parseWholeNumber(maximumHeartRate),
    restingHeartRateBpm: method === "heartRateReserve" ? parseWholeNumber(restingHeartRate) : null,
    customLowerBoundsBpm:
      method === "custom"
        ? customBounds.map((value) => parseWholeNumber(value) ?? Number.NaN)
        : null,
  };
}

function parseWholeNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
