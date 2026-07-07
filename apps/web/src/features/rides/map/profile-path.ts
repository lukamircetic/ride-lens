export function buildProfilePath(
  values: ReadonlyArray<number>,
  width: number,
  _height: number,
  baseline: number,
  top: number,
): string | null {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.00001);
  const span = baseline - top;
  const step = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = baseline - ((value - min) / range) * span;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildProfileArea(
  values: ReadonlyArray<number>,
  width: number,
  height: number,
  baseline: number,
  top: number,
): string | null {
  const line = buildProfilePath(values, width, height, baseline, top);

  if (!line) return null;

  return `${line} L${width.toFixed(2)} ${baseline} L0 ${baseline} Z`;
}
