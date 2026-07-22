import type { HeartRateZoneProfileResponse, SaveHeartRateZoneProfilePayload } from "@ride-lens/api";
import { Button } from "@ride-lens/ui/components/button";
import { Input } from "@ride-lens/ui/components/input";
import { Label } from "@ride-lens/ui/components/label";
import { useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { authClient } from "../../auth/auth-client";
import { getHeartRateZoneProfile, saveHeartRateZoneProfile } from "../rides/api";
import { AppHeader } from "../rides/components/app-header";
import { HeartRateZoneProfilePanel } from "../rides/components/heart-rate-zone-profile";
import { errorToMessage } from "../rides/formatters";
import type { LoadState } from "../rides/types";

const EMPTY_HEART_RATE_ZONE_PROFILE: HeartRateZoneProfileResponse = { profile: null };

const fieldClassName =
  "h-10 border-ride-line bg-ride-night-2 px-3 font-ride text-base text-ride-ink placeholder:text-ride-ink-dim focus-visible:border-ride-amber focus-visible:ring-ride-amber/25 sm:text-sm";

const sectionTitleClassName = "font-ride text-[13px] font-bold uppercase text-ride-ink-muted";

export function ProfilePage() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [heartRateZoneProfileState, setHeartRateZoneProfileState] = useState<
    LoadState<HeartRateZoneProfileResponse>
  >({ data: EMPTY_HEART_RATE_ZONE_PROFILE, error: null, loading: true });
  const [savingHeartRateZones, setSavingHeartRateZones] = useState(false);
  const [heartRateZoneMutationError, setHeartRateZoneMutationError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHeartRateZoneProfileState((current) => ({ ...current, error: null, loading: true }));

    getHeartRateZoneProfile()
      .then((profile) => {
        if (!cancelled) {
          setHeartRateZoneProfileState({ data: profile, error: null, loading: false });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHeartRateZoneProfileState((current) => ({
            ...current,
            error: errorToMessage(error, "Could not load heart-rate zones."),
            loading: false,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveHeartRateZones = async (payload: SaveHeartRateZoneProfilePayload) => {
    setSavingHeartRateZones(true);
    setHeartRateZoneMutationError(null);

    try {
      const profile = await saveHeartRateZoneProfile(payload);
      setHeartRateZoneProfileState({ data: profile, error: null, loading: false });
    } catch (error) {
      const message = errorToMessage(error, "Could not save heart-rate zones.");
      setHeartRateZoneMutationError(message);
      throw new Error(message);
    } finally {
      setSavingHeartRateZones(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setSignOutError(result.error.message ?? "Could not sign out.");
        return;
      }
      await navigate({ to: "/" });
    } catch {
      setSignOutError("Could not reach the authentication server.");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!session.data) return null;

  return (
    <div data-app="ride-lens">
      <div className="mx-auto max-w-[1240px] px-5 pb-[60px] sm:px-7">
        <AppHeader />

        <main>
          <section className="mt-12">
            <div className="border-b border-ride-line pb-4">
              <h1 className="font-ride text-[24px] font-extrabold uppercase tracking-[-0.025em] text-ride-ink">
                Profile
              </h1>
            </div>
          </section>

          <section className="mt-8" aria-labelledby="personal-details-title">
            <div className="mb-4">
              <h2 id="personal-details-title" className={sectionTitleClassName}>
                Personal details
              </h2>
            </div>
            <AccountDetails
              name={session.data.user.name}
              email={session.data.user.email}
              onRefresh={() => session.refetch({ query: { disableCookieCache: true } })}
            />
          </section>

          <section className="mt-10" aria-labelledby="heart-rate-profile-title">
            <div className="mb-4">
              <h2 id="heart-rate-profile-title" className={sectionTitleClassName}>
                Heart-rate profile
              </h2>
            </div>

            {heartRateZoneProfileState.error ? (
              <div className="border border-ride-line border-l-[3px] border-l-ride-danger px-3.5 py-3 text-sm text-[#e6a59d]">
                {heartRateZoneProfileState.error}
              </div>
            ) : null}

            {heartRateZoneProfileState.loading ? (
              <div className="h-[116px] animate-pulse border border-ride-line bg-ride-abyss" />
            ) : (
              <HeartRateZoneProfilePanel
                key={heartRateZoneProfileState.data?.profile?.id ?? "new-heart-rate-profile"}
                profile={heartRateZoneProfileState.data?.profile ?? null}
                saving={savingHeartRateZones}
                error={heartRateZoneMutationError}
                onSave={handleSaveHeartRateZones}
              />
            )}
          </section>

          <section
            className="mt-10 border border-ride-line bg-ride-abyss"
            aria-labelledby="session-title"
          >
            <div className="flex flex-wrap items-center justify-between gap-5 px-4 py-4">
              <div>
                <h2 id="session-title" className={sectionTitleClassName}>
                  Session
                </h2>
                <p className="mt-1 font-ride text-xs text-ride-ink-dim">Sign out of this device.</p>
              </div>
              <Button
                type="button"
                variant="unstyled"
                className="inline-flex h-9 items-center gap-2 border border-ride-line bg-ride-night-2 px-4 font-ride text-[10px] font-bold uppercase text-[#e6a59d] transition-colors hover:border-ride-danger hover:text-ride-danger disabled:opacity-50"
                disabled={isSigningOut}
                onClick={() => void signOut()}
              >
                <LogOutIcon className="size-3.5" />
                {isSigningOut ? "Signing out" : "Sign out"}
              </Button>
            </div>
            {signOutError ? (
              <p
                className="border-t border-ride-line px-4 py-3 font-ride-mono text-xs text-[#e6a59d]"
                role="alert"
              >
                {signOutError}
              </p>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

function AccountDetails({
  name: initialName,
  email: initialEmail,
  onRefresh,
}: {
  readonly name: string;
  readonly email: string;
  readonly onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => setName(initialName), [initialName]);
  useEffect(() => setEmail(initialEmail), [initialEmail]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const nextName = name.trim();
    const nextEmail = email.trim().toLowerCase();
    if (!nextName || !nextEmail) {
      setError("Name and email are required.");
      return;
    }

    const nameChanged = nextName !== initialName;
    const emailChanged = nextEmail !== initialEmail;
    if (!nameChanged && !emailChanged) {
      setStatus("Your details are already up to date.");
      return;
    }

    setSaving(true);
    let nameSaved = false;

    try {
      if (nameChanged) {
        const result = await authClient.updateUser({ name: nextName });
        if (result.error) {
          throw new Error(result.error.message ?? "Could not update your name.");
        }
        nameSaved = true;
      }

      if (emailChanged) {
        const result = await authClient.changeEmail({ newEmail: nextEmail });
        if (result.error) {
          throw new Error(result.error.message ?? "Could not update your email.");
        }
      }

      await onRefresh();
      setStatus("Profile details saved.");
    } catch (updateError) {
      await onRefresh();
      const message = errorToMessage(updateError, "Could not save profile details.");
      setError(nameSaved ? `Your name was saved. ${message}` : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="border border-ride-line bg-ride-abyss" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-px bg-ride-line-soft max-[680px]:grid-cols-1">
        <div className="bg-ride-abyss p-4">
          <Label
            htmlFor="profile-name"
            className="mb-2 font-ride text-[10px] font-bold uppercase text-ride-ink-dim"
          >
            Full name
          </Label>
          <Input
            id="profile-name"
            name="name"
            type="text"
            autoComplete="name"
            className={fieldClassName}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            required
          />
        </div>
        <div className="bg-ride-abyss p-4">
          <Label
            htmlFor="profile-email"
            className="mb-2 font-ride text-[10px] font-bold uppercase text-ride-ink-dim"
          >
            Email
          </Label>
          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={fieldClassName}
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-ride-line px-4 py-3.5">
        {error || status ? (
          <div className="font-ride-mono text-[11px]">
            {error ? (
              <span className="text-[#e6a59d]" role="alert">
                {error}
              </span>
            ) : (
              <span className="text-ride-tail" role="status">
                {status}
              </span>
            )}
          </div>
        ) : null}
        <Button
          type="submit"
          variant="unstyled"
          className="ml-auto h-9 border border-ride-amber bg-ride-amber px-4 font-ride text-[10px] font-bold uppercase text-[#15120a] transition-colors hover:bg-ride-amber-bright disabled:opacity-50"
          disabled={saving}
        >
          {saving ? "Saving details" : "Save details"}
        </Button>
      </div>
    </form>
  );
}
