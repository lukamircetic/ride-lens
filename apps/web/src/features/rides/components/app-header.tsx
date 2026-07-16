import { Button } from "@ride-lens/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ride-lens/ui/components/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileUpIcon, LogInIcon, LogOutIcon, UserPlusIcon, UserRoundIcon } from "lucide-react";
import { useState } from "react";

import { authClient } from "../../../auth/auth-client";

const navLinkClassName =
  "inline-flex h-[34px] items-center border border-ride-line bg-ride-night-2 px-3 font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber data-[status=active]:border-ride-amber data-[status=active]:bg-ride-amber data-[status=active]:text-[#15120a]";

const uploadButtonClassName =
  "inline-flex h-[34px] cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3.5 font-ride text-xs font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]";

const authButtonClassName =
  "inline-flex h-[34px] cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3 font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber [&_svg]:size-3.5";

const accountMenuItemClassName =
  "cursor-pointer bg-[#15181e] px-3 py-2.5 font-ride text-[11px] font-bold uppercase text-[#bdb9ad] focus:bg-[#23262c] focus:text-[#ffc72c] data-[variant=destructive]:bg-[#15181e] data-[variant=destructive]:text-[#e6a59d] data-[variant=destructive]:focus:bg-[#23262c] data-[variant=destructive]:focus:text-[#c8362c]";

export function AppHeader({
  uploading = false,
  uploadLabel = "Upload FIT",
  onUpload,
  onAuthModeChange,
}: {
  readonly uploading?: boolean;
  readonly uploadLabel?: string;
  readonly onUpload?: (() => void) | undefined;
  readonly onAuthModeChange?: ((mode: "sign-in" | "sign-up") => void) | undefined;
}) {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="pt-[26px] pb-[22px]">
      <div className="flex flex-wrap items-center gap-[22px]">
        <Link
          to="/"
          className="whitespace-nowrap font-ride text-[30px] leading-none font-black uppercase text-ride-ink no-underline"
        >
          Ride Lens
        </Link>
        <span
          className="h-[3px] min-w-[72px] flex-1 -translate-y-0.5 bg-[repeating-linear-gradient(90deg,var(--amber)_0_26px,transparent_26px_44px)]"
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex gap-2 whitespace-nowrap" aria-label="Primary">
            <Link to="/" className={navLinkClassName} activeOptions={{ exact: true }}>
              Rides
            </Link>
            <Link to="/segments" className={navLinkClassName}>
              Segments
            </Link>
          </nav>
          {onUpload ? (
            <Button
              type="button"
              variant="unstyled"
              className={uploadButtonClassName}
              disabled={uploading}
              onClick={onUpload}
            >
              <FileUpIcon />
              {uploadLabel}
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            {onAuthModeChange ? (
              <>
                <Button
                  type="button"
                  variant="unstyled"
                  className={authButtonClassName}
                  onClick={() => onAuthModeChange("sign-in")}
                >
                  <LogInIcon />
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="unstyled"
                  className={authButtonClassName}
                  onClick={() => onAuthModeChange("sign-up")}
                >
                  <UserPlusIcon />
                  Sign up
                </Button>
              </>
            ) : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-[34px] cursor-pointer place-items-center border border-transparent p-0 outline-none transition-colors hover:border-ride-line focus-visible:border-ride-amber data-popup-open:border-ride-line"
                  title={session.user.name}
                  aria-label={`Open profile menu for ${session.user.name}`}
                >
                  <span className="grid size-full shrink-0 place-items-center overflow-hidden bg-ride-amber font-ride-mono text-xs font-bold text-[#15120a]">
                    {session.user.image ? (
                      <img
                        src={session.user.image}
                        alt=""
                        className="size-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      userInitials(session.user.name)
                    )}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-48 border border-[#3a3f47] bg-[#15181e] p-1 text-[#f2efe6] shadow-xl ring-0"
                >
                  <DropdownMenuItem
                    className={accountMenuItemClassName}
                    onClick={() => void navigate({ to: "/profile" })}
                  >
                    <UserRoundIcon />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-0 bg-[#2a2d33]" />
                  <DropdownMenuItem
                    variant="destructive"
                    className={accountMenuItemClassName}
                    disabled={isSigningOut}
                    onClick={() => void signOut()}
                  >
                    <LogOutIcon />
                    {isSigningOut ? "Signing out" : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function userInitials(name: string): string {
  const names = name.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return "R";

  const first = names[0]?.[0] ?? "";
  const last = names.length > 1 ? (names.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
