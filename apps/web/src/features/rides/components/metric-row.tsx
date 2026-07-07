export function MetricRow({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="b-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}
