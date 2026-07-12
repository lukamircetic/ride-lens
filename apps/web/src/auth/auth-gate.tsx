import { Button } from "@ride-lens/ui/components/button";
import { Input } from "@ride-lens/ui/components/input";
import { Label } from "@ride-lens/ui/components/label";
import { LogInIcon, LoaderCircleIcon, UserPlusIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import Loader from "../components/loader";
import { AppHeader } from "../features/rides/components/app-header";
import { authClient } from "./auth-client";

type AuthMode = "sign-in" | "sign-up";

const fieldClassName =
  "h-11 border-ride-line bg-ride-night-2 px-3 font-ride-mono text-sm text-ride-ink placeholder:text-ride-ink-dim focus-visible:border-ride-amber focus-visible:ring-ride-amber/25";

const readField = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export function AuthGate({ children }: { readonly children: ReactNode }) {
  const session = authClient.useSession();

  if (session.isPending) {
    return <AuthLoading />;
  }

  if (!session.data) {
    return <SignedOutView onAuthenticated={() => session.refetch()} />;
  }

  return children;
}

function AuthLoading() {
  return (
    <div data-app="ride-lens" className="grid min-h-svh place-items-center">
      <Loader />
    </div>
  );
}

function SignedOutView({ onAuthenticated }: { readonly onAuthenticated: () => Promise<void> }) {
  const [mode, setMode] = useState<AuthMode>("sign-in");

  return (
    <div data-app="ride-lens">
      <div className="mx-auto min-h-svh max-w-[1240px] px-7 pb-[60px]">
        <AppHeader onAuthModeChange={setMode} />
        <main className="grid gap-12 pt-[clamp(52px,10vh,104px)] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
          <section className="max-w-[650px] border-l-[3px] border-ride-amber pl-6">
            <div className="font-ride-mono text-[11px] font-bold uppercase text-ride-amber">
              Private ride log
            </div>
            <h1 className="mt-3 max-w-[14ch] font-ride text-[40px] leading-[1.02] font-black uppercase text-ride-ink sm:text-[56px] lg:text-[64px]">
              Your roads. Your record.
            </h1>
          </section>

          <section className="border-t border-ride-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <AuthForm mode={mode} onModeChange={setMode} onAuthenticated={onAuthenticated} />
          </section>
        </main>
      </div>
    </div>
  );
}

function AuthForm({
  mode,
  onModeChange,
  onAuthenticated,
}: {
  readonly mode: AuthMode;
  readonly onModeChange: (mode: AuthMode) => void;
  readonly onAuthenticated: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setError(null);
    onModeChange(nextMode);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = readField(form, "email").trim();
    const password = readField(form, "password");

    try {
      if (mode === "sign-up") {
        const confirmPassword = readField(form, "confirmPassword");
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }

        const result = await authClient.signUp.email({
          name: readField(form, "name").trim(),
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Could not create your account.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Email or password is incorrect.");
          return;
        }
      }

      await onAuthenticated();
    } catch {
      setError("Authentication is unavailable. Check that the server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSignUp = mode === "sign-up";

  return (
    <div>
      <div
        className="grid grid-cols-2 border border-ride-line"
        role="tablist"
        aria-label="Account mode"
      >
        <AuthModeButton
          active={!isSignUp}
          icon={<LogInIcon />}
          label="Sign in"
          onClick={() => changeMode("sign-in")}
        />
        <AuthModeButton
          active={isSignUp}
          icon={<UserPlusIcon />}
          label="Create account"
          onClick={() => changeMode("sign-up")}
        />
      </div>

      <form key={mode} className="mt-7 space-y-5" onSubmit={submit}>
        {isSignUp ? (
          <div className="space-y-2">
            <Label htmlFor="auth-name" className="font-ride-mono uppercase text-ride-ink-muted">
              Name
            </Label>
            <Input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              className={fieldClassName}
              required
              autoFocus
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="auth-email" className="font-ride-mono uppercase text-ride-ink-muted">
            Email
          </Label>
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={fieldClassName}
            required
            autoFocus={!isSignUp}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-password" className="font-ride-mono uppercase text-ride-ink-muted">
            Password
          </Label>
          <Input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            className={fieldClassName}
            required
          />
        </div>

        {isSignUp ? (
          <div className="space-y-2">
            <Label
              htmlFor="auth-confirm-password"
              className="font-ride-mono uppercase text-ride-ink-muted"
            >
              Confirm password
            </Label>
            <Input
              id="auth-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={fieldClassName}
              required
            />
          </div>
        ) : null}

        <div className="min-h-6" aria-live="polite">
          {error ? (
            <p className="font-ride-mono text-xs leading-5 text-ride-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="h-11 w-full border border-ride-amber bg-ride-amber px-4 font-ride text-xs font-bold uppercase text-[#15120a] hover:bg-ride-amber-bright"
          disabled={isSubmitting}
        >
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function AuthModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly icon: ReactNode;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className="flex h-10 items-center justify-center gap-2 border-r border-ride-line px-2 font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors last:border-r-0 hover:text-ride-ink aria-selected:bg-ride-amber aria-selected:text-[#15120a] [&_svg]:size-3.5"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
