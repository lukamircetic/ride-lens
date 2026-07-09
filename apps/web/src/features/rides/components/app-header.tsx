import { Button } from "@ride-lens/ui/components/button";
import { Link } from "@tanstack/react-router";
import { FileUpIcon } from "lucide-react";

const navLinkClassName =
  "border border-ride-line bg-ride-night-2 px-3 py-[8px] font-ride text-[11px] font-bold uppercase text-ride-ink-muted transition-colors hover:border-ride-amber hover:text-ride-amber data-[status=active]:border-ride-amber data-[status=active]:bg-ride-amber data-[status=active]:text-[#15120a]";

const uploadButtonClassName =
  "inline-flex cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3.5 py-[9px] font-ride text-xs font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber disabled:cursor-default disabled:opacity-50 [&_svg]:size-[15px]";

export function AppHeader({
  uploading = false,
  uploadLabel = "Upload FIT",
  onUpload,
}: {
  readonly uploading?: boolean;
  readonly uploadLabel?: string;
  readonly onUpload?: (() => void) | undefined;
}) {
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
      </div>
    </header>
  );
}
