import { Button } from "@ride-lens/ui/components/button";
import { Input } from "@ride-lens/ui/components/input";
import { Label } from "@ride-lens/ui/components/label";
import { LoaderCircleIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import Loader from "../components/loader";
import { authClient } from "./auth-client";

type AuthMode = "sign-in" | "sign-up";

const fieldClassName =
  "h-11 border-ride-line bg-ride-night-2 px-3 font-ride text-sm text-ride-ink placeholder:text-ride-ink-dim focus-visible:border-ride-amber focus-visible:ring-ride-amber/25";

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
    <div data-app="ride-lens" className="auth-shell">
      <section className="auth-pane">
        <div className="auth-brand-row">
          <div className="font-ride text-[30px] leading-none font-black uppercase tracking-[-0.04em] text-ride-ink">
            Ride Lens
          </div>
          <span className="auth-brand-line" aria-hidden="true" />
        </div>

        <div className="auth-content">
          <div className="auth-form-container">
            <AuthForm mode={mode} onModeChange={setMode} onAuthenticated={onAuthenticated} />
          </div>
        </div>
      </section>

      <aside className="auth-art">
        <img
          src="/images/auth-road.webp"
          alt="A winding forest road viewed from above"
          className="auth-art-image"
        />
        <div className="auth-art-overlay" aria-hidden="true" />
      </aside>
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
  const isSignUp = mode === "sign-up";

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
      if (isSignUp) {
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

  return (
    <form key={mode} className="flex flex-col gap-6" onSubmit={submit}>
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 className="font-ride text-2xl font-extrabold tracking-[-0.025em] text-ride-ink">
          {isSignUp ? "Create your account" : "Sign in to Ride Lens"}
        </h1>
      </div>

      <div className="flex flex-col gap-5">
        {isSignUp ? (
          <AuthField label="Full name" htmlFor="auth-name">
            <Input
              id="auth-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Morgan"
              className={fieldClassName}
              required
              autoFocus
            />
          </AuthField>
        ) : null}

        <AuthField
          label="Email"
          htmlFor="auth-email"
          description={isSignUp ? "Used only to secure and identify your account." : undefined}
        >
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={fieldClassName}
            aria-invalid={error ? true : undefined}
            required
            autoFocus={!isSignUp}
          />
        </AuthField>

        <AuthField
          label="Password"
          htmlFor="auth-password"
          description={isSignUp ? "Use at least 8 characters." : undefined}
        >
          <Input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            className={fieldClassName}
            aria-invalid={error ? true : undefined}
            required
          />
        </AuthField>

        {isSignUp ? (
          <AuthField label="Confirm password" htmlFor="auth-confirm-password">
            <Input
              id="auth-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={fieldClassName}
              aria-invalid={error ? true : undefined}
              required
            />
          </AuthField>
        ) : null}
      </div>

      {error ? (
        <p
          className="border-l-2 border-ride-danger pl-3 font-ride-mono text-xs leading-5 text-ride-danger"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full border border-ride-amber bg-ride-amber px-4 font-ride text-xs font-bold uppercase text-[#15120a] hover:bg-ride-amber-bright"
        disabled={isSubmitting}
      >
        {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
        {isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ride-ink-muted">
        {isSignUp ? "Already have an account?" : "New to Ride Lens?"}{" "}
        <button
          type="button"
          className="font-semibold text-ride-ink underline decoration-ride-line underline-offset-4 transition-colors hover:text-ride-amber focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ride-amber"
          onClick={() => changeMode(isSignUp ? "sign-in" : "sign-up")}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}

function AuthField({
  label,
  htmlFor,
  description,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly description?: string | undefined;
  readonly children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="font-ride text-sm font-semibold text-ride-ink">
        {label}
      </Label>
      {children}
      {description ? (
        <p className="font-ride-mono text-[11px] leading-4 text-ride-ink-dim">{description}</p>
      ) : null}
    </div>
  );
}
