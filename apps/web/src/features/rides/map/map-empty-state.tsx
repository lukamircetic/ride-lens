export function MapEmptyState({ title, body }: { readonly title: string; readonly body: string }) {
  return (
    <div className="map-empty">
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </div>
  );
}
