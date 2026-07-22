import { Button } from "@ride-lens/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ride-lens/ui/components/dropdown-menu";
import { Sheet, SheetContent, SheetFooter, SheetTrigger } from "@ride-lens/ui/components/sheet";
import { cn } from "@ride-lens/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FileUpIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";

import { authClient } from "../../../auth/auth-client";

const navLinkClassName =
  "inline-flex h-[34px] items-center justify-center border border-ride-line bg-ride-night-2 px-3 font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber data-[status=active]:border-ride-amber data-[status=active]:bg-ride-amber data-[status=active]:text-[#15120a] md:justify-start";

const uploadButtonClassName =
  "inline-flex h-[34px] cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3.5 font-ride text-xs font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]";

const authButtonClassName =
  "inline-flex h-[34px] cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3 font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber [&_svg]:size-3.5";

const mobileNavigationButtonClassName =
  "grid size-[34px] cursor-pointer place-items-center border border-ride-line bg-ride-night-2 p-0 text-ride-amber outline-none transition-colors hover:border-ride-amber focus-visible:border-ride-amber focus-visible:ring-1 focus-visible:ring-ride-amber/25 [&_svg]:size-[17px] md:hidden";

const mobileNavLinkClassName =
  "flex h-12 items-center border-b border-ride-line-soft px-4 font-ride text-xs font-bold uppercase text-ride-ink-muted transition-colors hover:bg-[rgb(255_199_44_/_0.06)] hover:text-ride-amber data-[status=active]:bg-[rgb(255_199_44_/_0.1)] data-[status=active]:text-ride-amber";

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
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const closeMobileNavigation = () => setIsMobileNavigationOpen(false);

  const handleUpload = () => {
    closeMobileNavigation();
    onUpload?.();
  };

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
      <div className="grid grid-cols-[auto_minmax(24px,1fr)_34px] items-center gap-x-3 md:flex md:gap-[22px]">
        <Link
          to="/"
          className="whitespace-nowrap font-ride text-[30px] leading-none font-black uppercase text-ride-ink no-underline"
          onClick={closeMobileNavigation}
        >
          Ride Lens
        </Link>
        <span
          className="h-[3px] min-w-[72px] flex-1 -translate-y-0.5 bg-[repeating-linear-gradient(90deg,var(--amber)_0_26px,transparent_26px_44px)]"
          aria-hidden="true"
        />
        <Sheet open={isMobileNavigationOpen} onOpenChange={setIsMobileNavigationOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="unstyled"
                className={mobileNavigationButtonClassName}
                aria-label="Open navigation"
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent
            data-app="ride-lens"
            side="right"
            className="w-[min(84vw,320px)] border-l border-ride-line bg-ride-night text-ride-ink shadow-[-18px_0_50px_rgb(0_0_0_/_0.38)] [&_[data-slot=sheet-close]]:top-5 [&_[data-slot=sheet-close]]:right-5 [&_[data-slot=sheet-close]]:border [&_[data-slot=sheet-close]]:border-ride-line [&_[data-slot=sheet-close]]:text-ride-amber [&_[data-slot=sheet-close]]:hover:border-ride-amber [&_[data-slot=sheet-close]]:hover:bg-ride-night-2"
          >
            <nav className="flex flex-col px-5 pt-[72px] pb-4" aria-label="Mobile primary">
              <Link
                to="/"
                className={mobileNavLinkClassName}
                activeOptions={{ exact: true }}
                onClick={closeMobileNavigation}
              >
                Rides
              </Link>
              <Link
                to="/segments"
                className={mobileNavLinkClassName}
                onClick={closeMobileNavigation}
              >
                Segments
              </Link>
              {session ? (
                <Link
                  to="/profile"
                  className={mobileNavLinkClassName}
                  onClick={closeMobileNavigation}
                >
                  Profile
                </Link>
              ) : null}
              {onAuthModeChange ? (
                <>
                  <Button
                    type="button"
                    variant="unstyled"
                    className={mobileNavLinkClassName}
                    onClick={() => {
                      closeMobileNavigation();
                      onAuthModeChange("sign-in");
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="unstyled"
                    className={mobileNavLinkClassName}
                    onClick={() => {
                      closeMobileNavigation();
                      onAuthModeChange("sign-up");
                    }}
                  >
                    Sign up
                  </Button>
                </>
              ) : null}
            </nav>
            {session ? (
              <SheetFooter className="border-t border-ride-line px-5 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <AccountAvatar name={session.user.name} image={session.user.image} />
                  <span className="truncate font-ride text-[11px] font-bold uppercase text-ride-ink-muted">
                    {session.user.name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="unstyled"
                  className={cn(authButtonClassName, "w-full justify-center")}
                  disabled={isSigningOut}
                  onClick={() => {
                    closeMobileNavigation();
                    void signOut();
                  }}
                >
                  <LogOutIcon />
                  {isSigningOut ? "Signing out" : "Sign out"}
                </Button>
              </SheetFooter>
            ) : null}
          </SheetContent>
        </Sheet>
        {onUpload ? (
          <Button
            type="button"
            variant="unstyled"
            className={cn(uploadButtonClassName, "col-span-3 mt-4 w-full justify-center md:hidden")}
            disabled={uploading}
            onClick={handleUpload}
          >
            <FileUpIcon />
            {uploadLabel}
          </Button>
        ) : null}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <nav className="flex gap-2 whitespace-nowrap" aria-label="Primary">
            <Link
              to="/"
              className={navLinkClassName}
              activeOptions={{ exact: true }}
              onClick={closeMobileNavigation}
            >
              Rides
            </Link>
            <Link to="/segments" className={navLinkClassName} onClick={closeMobileNavigation}>
              Segments
            </Link>
          </nav>
          {onUpload ? (
            <Button
              type="button"
              variant="unstyled"
              className={uploadButtonClassName}
              disabled={uploading}
              onClick={handleUpload}
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
                  onClick={() => {
                    closeMobileNavigation();
                    onAuthModeChange("sign-in");
                  }}
                >
                  <LogInIcon />
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant="unstyled"
                  className={authButtonClassName}
                  onClick={() => {
                    closeMobileNavigation();
                    onAuthModeChange("sign-up");
                  }}
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
                  <AccountAvatar name={session.user.name} image={session.user.image} />
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

function AccountAvatar({ name, image }: { readonly name: string; readonly image?: string | null }) {
  return (
    <span className="grid size-[34px] shrink-0 place-items-center overflow-hidden bg-ride-amber font-ride-mono text-xs font-bold text-[#15120a]">
      {image ? (
        <img src={image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        userInitials(name)
      )}
    </span>
  );
}

function userInitials(name: string): string {
  const names = name.trim().split(/\s+/).filter(Boolean);
  if (names.length === 0) return "R";

  const first = names[0]?.[0] ?? "";
  const last = names.length > 1 ? (names.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}
