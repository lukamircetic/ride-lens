import { Button } from "@ride-lens/ui/components/button";
import { FileUpIcon } from "lucide-react";

export function EmptyState({ onUpload }: { readonly onUpload: () => void }) {
  return (
    <div className="mt-[26px] border border-ride-line bg-ride-abyss px-6 py-16 text-center">
      <div className="font-ride text-[40px] font-black text-ride-amber">▲</div>
      <div className="mt-3.5 font-ride text-lg font-bold uppercase">No rides yet</div>
      <div className="mx-auto mt-2 max-w-[36ch] font-ride-mono text-[13px] text-ride-ink-dim">
        Upload a FIT activity to start building the dashboard.
      </div>
      <Button
        type="button"
        variant="unstyled"
        className="mt-5 inline-flex cursor-pointer items-center gap-2 border border-ride-line bg-ride-night-2 px-3.5 py-[9px] font-ride text-xs font-bold uppercase text-ride-ink transition-colors hover:border-ride-amber hover:text-ride-amber [&_svg]:size-[15px]"
        onClick={onUpload}
      >
        <FileUpIcon />
        Upload FIT
      </Button>
    </div>
  );
}
