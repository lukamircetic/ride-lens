export function GantryRow({
  label,
  value,
  unit,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
}) {
  return (
    <div className="gantry-row">
      <div className="gantry-dest">
        <span>{label}</span>
      </div>
      <div className="gantry-val">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
    </div>
  );
}

export function Sign({
  label,
  value,
  cap,
  accent,
  onClick,
}: {
  readonly label: string;
  readonly value: string;
  readonly cap?: string;
  readonly accent?: boolean;
  readonly onClick?: () => void;
}) {
  const className = `sign${accent ? " accent" : ""}${onClick ? " clickable" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <div className="lbl">{label}</div>
        <div className="num">{value}</div>
        {cap ? <div className="cap">{cap}</div> : null}
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="lbl">{label}</div>
      <div className="num">{value}</div>
      {cap ? <div className="cap">{cap}</div> : null}
    </div>
  );
}
