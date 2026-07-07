import { FileUpIcon } from "lucide-react";

export function EmptyState({ onUpload }: { readonly onUpload: () => void }) {
  return (
    <div className="empty">
      <div className="glyph">▲</div>
      <div className="t">No rides yet</div>
      <div className="d">Upload a FIT activity to start building the dashboard.</div>
      <button type="button" className="rh-btn" onClick={onUpload}>
        <FileUpIcon />
        Upload FIT
      </button>
    </div>
  );
}
